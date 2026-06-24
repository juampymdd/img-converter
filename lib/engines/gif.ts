// Single-frame GIF encode via gifenc (pure JS, no Web Workers — CDN-safe).
import { cdnImport, VERSIONS } from './cdn';

export async function encodeGif(data: ImageData): Promise<ArrayBuffer> {
  const { GIFEncoder, quantize, applyPalette } = await cdnImport(VERSIONS.gifenc);

  const rgba = data.data; // Uint8ClampedArray RGBA
  const palette = quantize(rgba, 256);
  const index = applyPalette(rgba, palette);

  const gif = GIFEncoder();
  gif.writeFrame(index, data.width, data.height, { palette });
  gif.finish();

  const bytes: Uint8Array = gif.bytes();
  const copy = new Uint8Array(bytes);
  return copy.buffer as ArrayBuffer;
}
