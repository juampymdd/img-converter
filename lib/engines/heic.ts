// HEIC / HEIF decode via libheif-js (CDN, see cdn.ts). Used only when the
// browser cannot decode HEIC natively (worker's native-bitmap fast path).
import { cdnImport, VERSIONS } from './cdn';

export async function decodeHeic(buffer: ArrayBuffer): Promise<ImageData> {
  const mod = await cdnImport(VERSIONS.libheif);
  const libheif = mod.default ?? mod;

  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(buffer));
  if (!images || images.length === 0) throw new Error('No image found in HEIC container');

  const image = images[0];
  const width: number = image.get_width();
  const height: number = image.get_height();
  const imageData = new ImageData(width, height);

  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (displayData: ImageData | null) => {
      if (!displayData) reject(new Error('HEIC display() returned no data'));
      else resolve();
    });
  });

  return imageData;
}
