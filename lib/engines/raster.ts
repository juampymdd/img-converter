// Dependency-free encoders for formats no WASM codec covers cleanly.

/** 32-bit top-down BGRA BMP. */
export function encodeBmp(data: ImageData): ArrayBuffer {
  const { width, height } = data;
  const rowSize = width * 4;
  const pixelArraySize = rowSize * height;
  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const offset = fileHeaderSize + infoHeaderSize;
  const fileSize = offset + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, offset, true);

  // BITMAPINFOHEADER
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative => top-down rows
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 32, true); // bpp
  view.setUint32(30, 0, true); // BI_RGB
  view.setUint32(34, pixelArraySize, true);

  const src = data.data;
  let p = offset;
  for (let i = 0; i < src.length; i += 4) {
    view.setUint8(p++, src[i + 2]!); // B
    view.setUint8(p++, src[i + 1]!); // G
    view.setUint8(p++, src[i]!); // R
    view.setUint8(p++, src[i + 3]!); // A
  }
  return buffer;
}

/** ICO containing a single PNG-compressed image (capped to 256px by the caller). */
export async function encodeIco(data: ImageData): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(data.width, data.height);
  const c = canvas.getContext('2d');
  if (!c) throw new Error('OffscreenCanvas 2D context unavailable');
  c.putImageData(data, 0, 0);
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  const png = new Uint8Array(await pngBlob.arrayBuffer());

  const header = new ArrayBuffer(6 + 16);
  const view = new DataView(header);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, 1, true); // image count
  // ICONDIRENTRY
  view.setUint8(6, data.width >= 256 ? 0 : data.width); // 0 == 256
  view.setUint8(7, data.height >= 256 ? 0 : data.height);
  view.setUint8(8, 0); // palette
  view.setUint8(9, 0); // reserved
  view.setUint16(10, 1, true); // color planes
  view.setUint16(12, 32, true); // bpp
  view.setUint32(14, png.length, true); // size of PNG data
  view.setUint32(18, 6 + 16, true); // offset to PNG data

  const out = new Uint8Array(6 + 16 + png.length);
  out.set(new Uint8Array(header), 0);
  out.set(png, 6 + 16);
  return out.buffer as ArrayBuffer;
}
