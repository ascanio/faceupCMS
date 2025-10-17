/**
 * Resize and crop image to exact dimensions without deformation
 * @param file - The image file to resize
 * @param targetWidth - Target width in pixels
 * @param targetHeight - Target height in pixels
 * @returns Promise<File> - Resized image as a File object
 */
export async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      const targetAspect = targetWidth / targetHeight;
      const imageAspect = img.width / img.height;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.width;
      let sourceHeight = img.height;

      // Crop to match target aspect ratio
      if (imageAspect > targetAspect) {
        // Image is wider, crop width
        sourceWidth = img.height * targetAspect;
        sourceX = (img.width - sourceWidth) / 2;
      } else if (imageAspect < targetAspect) {
        // Image is taller, crop height
        sourceHeight = img.width / targetAspect;
        sourceY = (img.height - sourceHeight) / 2;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw cropped and scaled image
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        'image/webp',
        0.9
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}



