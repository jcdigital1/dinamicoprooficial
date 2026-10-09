import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { DetectionResult, QRPlacement } from '../types';

/**
 * Loads an image safely handling CORS via proxy or direct anonymous mode
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: try proxying through local endpoint
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (err) => reject(new Error(`Falha ao carregar imagem: ${err}`));
      fallbackImg.src = proxyUrl;
    };

    img.src = url;
  });
}

/**
 * Uses jsQR to analyze canvas pixels and detect the bounding box of the fake QR code
 */
export async function detectQRCodeInImage(imageUrl: string): Promise<DetectionResult> {
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { detected: false, message: 'Canvas context indisponível' };
    }

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    const code = jsQR(imageData.data, width, height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.location) {
      const loc = code.location;
      const xs = [loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomRightCorner.x, loc.bottomLeftCorner.x];
      const ys = [loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomRightCorner.y, loc.bottomLeftCorner.y];

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const qrWidth = maxX - minX;
      const qrHeight = maxY - minY;
      const boxSize = Math.max(qrWidth, qrHeight);

      const normX = minX / width;
      const normY = minY / height;
      const normSize = boxSize / width;

      const placement: QRPlacement = {
        x: Number(normX.toFixed(4)),
        y: Number(normY.toFixed(4)),
        size: Number(normSize.toFixed(4)),
      };

      return {
        detected: true,
        placement,
        decodedText: code.data,
        confidence: 1.0,
        message: 'QR Code fictício detectado com exatidão!',
      };
    }

    return {
      detected: false,
      message: 'QR Code não detectado automaticamente. Realize a calibração manual.',
    };
  } catch (error: any) {
    return {
      detected: false,
      message: `Erro na análise: ${error?.message || error}`,
    };
  }
}

/**
 * Validates that a generated QR code on a canvas can be read back cleanly
 */
export function validateRenderedQRCode(canvas: HTMLCanvasElement, placement: QRPlacement, expectedText: string): boolean {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    const width = canvas.width;
    const height = canvas.height;

    const pxX = Math.floor(placement.x * width);
    const pxY = Math.floor(placement.y * height);
    const pxSize = Math.floor(placement.size * width);

    // Sample the exact QR region with a comfortable 20px quiet zone margin for jsQR
    const sampleX = Math.max(0, pxX - 15);
    const sampleY = Math.max(0, pxY - 15);
    const sampleW = Math.min(width - sampleX, pxSize + 30);
    const sampleH = Math.min(height - sampleY, pxSize + 30);

    const subData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
    const decoded = jsQR(subData.data, sampleW, sampleH, { inversionAttempts: 'attemptBoth' });

    if (decoded && decoded.data === expectedText) {
      return true;
    }

    // Try full canvas decode if sub-region failed
    const fullData = ctx.getImageData(0, 0, width, height);
    const fullDecoded = jsQR(fullData.data, width, height, { inversionAttempts: 'attemptBoth' });
    return !!(fullDecoded && fullDecoded.data === expectedText);
  } catch {
    return false;
  }
}

/**
 * Generates sharp, crisp QR code canvas with margin 0 so it aligns with the exact detected box
 */
export async function createQRCodeCanvas(text: string, sizePx: number = 800): Promise<HTMLCanvasElement> {
  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = sizePx;
  qrCanvas.height = sizePx;

  await QRCode.toCanvas(qrCanvas, text, {
    errorCorrectionLevel: 'M', // Clean, sharp modules matching Canva physical size
    margin: 0,                 // Zero extra margin: modules span the entire square
    width: sizePx,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return qrCanvas;
}
