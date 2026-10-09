import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Plate, PlateModel } from '../types';
import { composePlateImage } from './imageComposer';

/**
 * Trigger browser file download from Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads single plate as high-resolution PNG
 */
export async function downloadSinglePlatePNG(plate: Plate, model: PlateModel): Promise<void> {
  const composed = await composePlateImage(
    model.imageUrl,
    plate.qrPlacement,
    plate.publicUrl,
    plate.plateNumber,
    { targetWidth: 1200 }
  );

  composed.canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `${plate.plateNumber}.png`);
    }
  }, 'image/png');
}

export interface BatchProgressCallback {
  (progress: { current: number; total: number; message: string }): void;
}

/**
 * Composes all plates in a batch and exports as a structured ZIP file
 */
export async function exportBatchZIP(
  plates: Plate[],
  model: PlateModel,
  onProgress?: BatchProgressCallback
): Promise<void> {
  const zip = new JSZip();
  const total = plates.length;

  for (let i = 0; i < total; i++) {
    const plate = plates[i];
    onProgress?.({
      current: i + 1,
      total,
      message: `Compondo ${plate.plateNumber} (${i + 1}/${total})...`,
    });

    const composed = await composePlateImage(
      model.imageUrl,
      plate.qrPlacement,
      plate.publicUrl,
      plate.plateNumber,
      { targetWidth: 1200 }
    );

    // Convert data URL to base64 binary
    const base64Data = composed.dataUrl.replace(/^data:image\/png;base64,/, '');
    zip.file(`${plate.plateNumber}.png`, base64Data, { base64: true });
  }

  onProgress?.({
    current: total,
    total,
    message: 'Compactando arquivo ZIP final...',
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const batchName = plates[0]?.batchId || 'lote-plaquinhas';
  downloadBlob(content, `${batchName}.zip`);
}

/**
 * Professional A4 PDF export:
 * - A4 Sheet: 21.0 x 29.7 cm (210mm x 297mm)
 * - Plate dimensions: 10.0 x 10.0 cm (100mm x 100mm)
 * - 4 plates per page (2 columns x 2 rows)
 * - Margins: 0.5 cm left/right, 4.85 cm top/bottom
 * - Multi-page support preserving 10x10cm scale on remaining plates
 */
export async function exportBatchPDF(
  plates: Plate[],
  model: PlateModel,
  onProgress?: BatchProgressCallback
): Promise<void> {
  // A4 dimensions in centimeters
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'cm',
    format: [21.0, 29.7], // A4
  });

  const total = plates.length;
  const platesPerPage = 4;
  const totalPages = Math.ceil(total / platesPerPage);

  const PLATE_SIZE_CM = 10.0;
  const MARGIN_LEFT_CM = 0.5;
  const MARGIN_TOP_CM = 4.85;

  // Pre-render all plates to high-res data URLs
  const renderedImages: { plateNumber: string; dataUrl: string }[] = [];

  for (let i = 0; i < total; i++) {
    const plate = plates[i];
    onProgress?.({
      current: i + 1,
      total,
      message: `Processando plaquinha ${i + 1} de ${total} para impressão...`,
    });

    const composed = await composePlateImage(
      model.imageUrl,
      plate.qrPlacement,
      plate.publicUrl,
      plate.plateNumber,
      { targetWidth: 1200 }
    );

    renderedImages.push({
      plateNumber: plate.plateNumber,
      dataUrl: composed.dataUrl,
    });
  }

  onProgress?.({
    current: total,
    total,
    message: 'Montando páginas A4 com alinhamento milimétrico...',
  });

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) {
      doc.addPage([21.0, 29.7], 'portrait');
    }

    const startIndex = p * platesPerPage;
    const pagePlates = renderedImages.slice(startIndex, startIndex + platesPerPage);

    // Grid coordinates:
    // Slot 0: col 0, row 0 -> (0.5, 4.85)
    // Slot 1: col 1, row 0 -> (10.5, 4.85)
    // Slot 2: col 0, row 1 -> (0.5, 14.85)
    // Slot 3: col 1, row 1 -> (10.5, 14.85)
    pagePlates.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      const x = MARGIN_LEFT_CM + col * PLATE_SIZE_CM;
      const y = MARGIN_TOP_CM + row * PLATE_SIZE_CM;

      // Draw high resolution image exactly 10x10 cm
      doc.addImage(item.dataUrl, 'PNG', x, y, PLATE_SIZE_CM, PLATE_SIZE_CM, undefined, 'FAST');

      // Subtle cutting guideline (very fine 0.1pt gray line around the 10x10cm edge)
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.01);
      doc.rect(x, y, PLATE_SIZE_CM, PLATE_SIZE_CM);

      // Discreet technical code outside printable area or corner
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text(item.plateNumber, x + 0.2, y + PLATE_SIZE_CM - 0.2);
    });

    // Technical header on top margin (A4 page header)
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `DINÂMICO PRO | Gabarito de Impressão A4 (10x10cm) — Página ${p + 1} de ${totalPages} — Modelo: ${model.name}`,
      MARGIN_LEFT_CM,
      MARGIN_TOP_CM - 0.8
    );
  }

  const batchCode = plates[0]?.batchId || 'lote-impressao';
  doc.save(`${batchCode}_A4_10x10cm.pdf`);
}
