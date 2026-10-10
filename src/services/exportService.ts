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
 * Downloads single plate as high-resolution PNG on-demand and frees memory immediately
 */
export async function downloadSinglePlatePNG(plate: Plate, model: PlateModel): Promise<void> {
  const composed = await composePlateImage(
    model.imageUrl,
    plate.qrPlacement,
    plate.publicUrl,
    plate.plateNumber,
    { targetWidth: 1200, forceFresh: true, noCache: true }
  );

  await new Promise<void>((resolve) => {
    composed.canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${plate.plateNumber}.png`);
      }
      // Release canvas memory immediately after blob generation
      composed.canvas.width = 0;
      composed.canvas.height = 0;
      resolve();
    }, 'image/png');
  });
}

export interface BatchProgressCallback {
  (progress: { current: number; total: number; message: string }): void;
}

/**
 * Composes all plates in a batch on-demand sequentially and exports as a structured ZIP file
 * Discards temporary canvases immediately to avoid memory leaks
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
      { targetWidth: 1200, forceFresh: true, noCache: true }
    );

    // Convert data URL to base64 binary
    const base64Data = composed.dataUrl.replace(/^data:image\/png;base64,/, '');
    zip.file(`${plate.plateNumber}.png`, base64Data, { base64: true });

    // Release canvas memory immediately
    composed.canvas.width = 0;
    composed.canvas.height = 0;
  }

  onProgress?.({
    current: total,
    total,
    message: 'Compactando arquivo ZIP final na memória...',
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const batchName = plates[0]?.batchId || 'lote-plaquinhas';
  downloadBlob(content, `${batchName}.zip`);
}

/**
 * Professional A4 PDF export generated on-demand page by page:
 * - A4 Sheet: 21.0 x 29.7 cm (210mm x 297mm)
 * - Plate dimensions: 10.0 x 10.0 cm (100mm x 100mm)
 * - 4 plates per page (2 columns x 2 rows)
 * - Margins: 0.5 cm left/right, 4.85 cm top/bottom
 * - Discards temporary plate canvases immediately to avoid memory accumulation
 */
export async function exportBatchPDF(
  plates: Plate[],
  model: PlateModel,
  onProgress?: BatchProgressCallback
): Promise<void> {
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

  let currentPage = -1;

  for (let i = 0; i < total; i++) {
    const plate = plates[i];
    const pageIndex = Math.floor(i / platesPerPage);
    const slotOnPage = i % platesPerPage;

    if (pageIndex !== currentPage) {
      currentPage = pageIndex;
      if (currentPage > 0) {
        doc.addPage([21.0, 29.7], 'portrait');
      }

      // Technical header on top margin
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(
        `DINÂMICO PRO | Gabarito de Impressão A4 (10x10cm) — Página ${currentPage + 1} de ${totalPages} — Modelo: ${model.name}`,
        MARGIN_LEFT_CM,
        MARGIN_TOP_CM - 0.8
      );
    }

    onProgress?.({
      current: i + 1,
      total,
      message: `Compondo ${plate.plateNumber} (${i + 1}/${total}) para impressão...`,
    });

    const composed = await composePlateImage(
      model.imageUrl,
      plate.qrPlacement,
      plate.publicUrl,
      plate.plateNumber,
      { targetWidth: 1000, forceFresh: true, noCache: true }
    );

    const col = slotOnPage % 2;
    const row = Math.floor(slotOnPage / 2);
    const x = MARGIN_LEFT_CM + col * PLATE_SIZE_CM;
    const y = MARGIN_TOP_CM + row * PLATE_SIZE_CM;

    // Draw high resolution image exactly 10x10 cm
    doc.addImage(composed.dataUrl, 'PNG', x, y, PLATE_SIZE_CM, PLATE_SIZE_CM, undefined, 'FAST');

    // Subtle cutting guideline (very fine 0.1pt gray line around the 10x10cm edge)
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.01);
    doc.rect(x, y, PLATE_SIZE_CM, PLATE_SIZE_CM);

    // Discreet technical code outside printable area or corner
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(plate.plateNumber, x + 0.2, y + PLATE_SIZE_CM - 0.2);

    // Release canvas memory immediately
    composed.canvas.width = 0;
    composed.canvas.height = 0;
  }

  onProgress?.({
    current: total,
    total,
    message: 'Finalizando arquivo PDF...',
  });

  const batchCode = plates[0]?.batchId || 'lote-impressao';
  doc.save(`${batchCode}_A4_10x10cm.pdf`);
}
