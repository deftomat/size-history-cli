import compressedExtensions from 'compressed-extensions';
import videoExtensions from 'video-extensions';
import zlib from 'zlib';

const compressedImages = ['jpeg', 'jpg', 'png', 'webp', '.avif', '.heic'];
const nonCompressibleExtensions = [
  ...compressedExtensions,
  ...compressedImages,
  ...videoExtensions
];

export function canCompress(filename: string, fileSize: number): boolean {
  const sizeLimit = 32 * 1024 * 1024;

  return (
    nonCompressibleExtensions.every(ext => !filename.endsWith(`.${ext}`)) && fileSize < sizeLimit
  );
}

export function calculateGzipSize(input: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    zlib.gzip(input, { level: 9 }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result.length);
      }
    });
  });
}

export function calculateBrotliSize(input: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    zlib.brotliCompress(
      input,
      { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.length);
        }
      }
    );
  });
}
