const MAX_THUMB_SIZE = 200;
const JPEG_QUALITY = 0.7;

/**
 * Generate a thumbnail data URL from a full-size image data URL.
 * Works in service worker context using OffscreenCanvas.
 */
export async function generateThumbnail(dataUrl: string): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const { width, height } = bitmap;
  const scale = Math.min(MAX_THUMB_SIZE / width, MAX_THUMB_SIZE / height, 1);
  const thumbW = Math.round(width * scale);
  const thumbH = Math.round(height * scale);

  const canvas = new OffscreenCanvas(thumbW, thumbH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create thumbnail canvas context');

  ctx.drawImage(bitmap, 0, 0, thumbW, thumbH);
  bitmap.close();

  const thumbBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  return blobToDataUrl(thumbBlob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a data URL to a Blob for efficient IndexedDB storage.
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
