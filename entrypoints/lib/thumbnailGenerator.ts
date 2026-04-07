const MAX_THUMB_SIZE = 200;
const JPEG_QUALITY = 0.7;

export async function generateThumbnail(imageDataUrl: string): Promise<Blob> {
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const { width, height } = bitmap;
  const scale = Math.min(MAX_THUMB_SIZE / width, MAX_THUMB_SIZE / height, 1);
  const thumbWidth = Math.round(width * scale);
  const thumbHeight = Math.round(height * scale);

  const canvas = new OffscreenCanvas(thumbWidth, thumbHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create thumbnail canvas context');

  ctx.drawImage(bitmap, 0, 0, thumbWidth, thumbHeight);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
}

export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
