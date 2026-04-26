/**
 * Client-side image compression utility
 * Uses Canvas API to resize and compress images before upload
 * This prevents 413 Payload Too Large errors
 */

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  size: number; // in bytes
}

export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
  } = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image with white background (for transparent PNGs)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Create new File from blob
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '.jpg'),
            { type: format }
          );

          resolve({
            blob,
            file: compressedFile,
            width,
            height,
            size: blob.size
          });
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options?: Parameters<typeof compressImage>[1]
): Promise<CompressedImageResult[]> {
  return Promise.all(
    files.map(file => compressImage(file, options))
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
