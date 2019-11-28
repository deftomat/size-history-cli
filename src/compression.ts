import zlib from 'zlib';

export async function canCompress(filename: string, fileSize: number) {
  const sizeLimit = 32 * 1024 * 1024;
  const supported = ['.js', '.css', '.svg', '.ttf', '.otf', '.html', '.json', '.xml', '.csv'];
  return supported.some(ext => filename.endsWith(ext)) && fileSize < sizeLimit;
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
      { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } },
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
