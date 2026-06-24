// TIFF decode + encode via UTIF.js (pure JS, no Web Workers — CDN-safe).
import { cdnImport, VERSIONS } from './cdn';

export async function decodeTiff(buffer: ArrayBuffer): Promise<ImageData> {
  const mod = await cdnImport(VERSIONS.utif);
  const UTIF = mod.default ?? mod;

  const ifds = UTIF.decode(buffer);
  if (!ifds || ifds.length === 0) throw new Error('No image found in TIFF');
  const first = ifds[0];
  UTIF.decodeImage(buffer, first);

  const rgba: Uint8Array = UTIF.toRGBA8(first);
  const width: number = first.width;
  const height: number = first.height;
  return new ImageData(new Uint8ClampedArray(rgba), width, height);
}

export async function encodeTiff(data: ImageData): Promise<ArrayBuffer> {
  const mod = await cdnImport(VERSIONS.utif);
  const UTIF = mod.default ?? mod;
  // UTIF.encodeImage(rgba, width, height) -> ArrayBuffer (uncompressed RGBA TIFF).
  return UTIF.encodeImage(data.data, data.width, data.height) as ArrayBuffer;
}
