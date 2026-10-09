import { QRPlacement } from '../types';
import { loadImage, createQRCodeCanvas, validateRenderedQRCode } from './qrDetector';

export interface ComposeResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  isValidated: boolean;
  width: number;
  height: number;
}

// In-memory cache for composed images so UI and export share the exact same rendered buffer
const composedCache = new Map<string, ComposeResult>();

/**
 * Composes the final plate image by replacing the fake QR code with the real dynamic QR code.
 * Replaces EXCLUSIVELY the detected square box of the dummy code without disturbing NFC or text.
 */
export async function composePlateImage(
  artworkUrl: string,
  qrPlacement: QRPlacement,
  publicUrl: string,
  plateNumber?: string,
  options?: {
    forceFresh?: boolean;
    targetWidth?: number;
  }
): Promise<ComposeResult> {
  const cacheKey = `${artworkUrl}_${publicUrl}_${qrPlacement.x}_${qrPlacement.y}_${qrPlacement.size}`;
  if (!options?.forceFresh && composedCache.has(cacheKey)) {
    return composedCache.get(cacheKey)!;
  }

  // 1. Load original art in its natural dimensions
  const img = await loadImage(artworkUrl);
  const naturalWidth = img.naturalWidth || img.width || 800;
  const naturalHeight = img.naturalHeight || img.height || 800;

  // Use natural dimensions as primary coordinate authority
  const width = options?.targetWidth ? Math.max(naturalWidth, options.targetWidth) : naturalWidth;
  const height = Math.round(width * (naturalHeight / naturalWidth));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Falha ao inicializar contexto Canvas 2D');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 2. Draw original art completely
  ctx.drawImage(img, 0, 0, width, height);

  // 3. Calculate exact pixel coordinates of the fake QR area
  const pxX = Math.round(qrPlacement.x * width);
  const pxY = Math.round(qrPlacement.y * height);
  const pxSize = Math.round(qrPlacement.size * width);

  // 4. Overwrite fake QR code with clean white background patch
  // 1px buffer to ensure no ghost edges of the old code remain
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(pxX - 1, pxY - 1, pxSize + 2, pxSize + 2);
  ctx.restore();

  // 5. Generate sharp dynamic QR code
  // Generate at high resolution (800px) and draw onto the exact target square
  const qrCanvas = await createQRCodeCanvas(publicUrl, 800);

  // 6. Draw the new QR code directly into the exact box of the old code
  ctx.drawImage(qrCanvas, pxX, pxY, pxSize, pxSize);

  // 7. Verify readability
  const isValidated = validateRenderedQRCode(canvas, qrPlacement, publicUrl);
  const dataUrl = canvas.toDataURL('image/png');

  const result: ComposeResult = {
    canvas,
    dataUrl,
    isValidated,
    width,
    height,
  };

  composedCache.set(cacheKey, result);
  return result;
}
