/// <reference lib="webworker" />
import type {
  ConvertOptions,
  Engine,
  ImageFormat,
  WorkerRequest,
  WorkerResponse,
} from '@/lib/types';
import { cdnImport, VERSIONS } from '@/lib/engines/cdn';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: WorkerResponse, transfer?: Transferable[]) {
  ctx.postMessage(msg, transfer ?? []);
}

/* ------------------------------------------------------------------ *
 * Decoding: any supported format -> ImageData (RGBA, 8-bit).
 * ------------------------------------------------------------------ */

async function imageDataFromBitmap(bitmap: ImageBitmap): Promise<ImageData> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const c = canvas.getContext('2d');
  if (!c) throw new Error('OffscreenCanvas 2D context unavailable');
  c.drawImage(bitmap, 0, 0);
  return c.getImageData(0, 0, bitmap.width, bitmap.height);
}

/** Browser-native decode path (BMP, GIF first frame, ICO, and HEIC on Safari 17.6+). */
async function decodeNative(buffer: ArrayBuffer, mime: string): Promise<ImageData> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mime }));
  try {
    return await imageDataFromBitmap(bitmap);
  } finally {
    bitmap.close();
  }
}

async function decode(format: ImageFormat, buffer: ArrayBuffer): Promise<{ data: ImageData; engine: Engine }> {
  switch (format) {
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'avif':
    case 'jxl': {
      const mod = await cdnImport(VERSIONS[format]);
      return { data: await mod.decode(buffer), engine: 'jsquash' };
    }
    case 'svg': {
      const { initResvg, renderSvgToImageData } = await import('@/lib/engines/resvg');
      await initResvg();
      return { data: await renderSvgToImageData(buffer), engine: 'resvg' };
    }
    case 'heic': {
      // Fast path: native bitmap decode (Safari 17.6+). Fall back to libheif.
      try {
        return { data: await decodeNative(buffer, 'image/heic'), engine: 'native-bitmap' };
      } catch {
        const { decodeHeic } = await import('@/lib/engines/heic');
        return { data: await decodeHeic(buffer), engine: 'libheif' };
      }
    }
    case 'tiff': {
      const { decodeTiff } = await import('@/lib/engines/tiff');
      return { data: await decodeTiff(buffer), engine: 'utif' };
    }
    case 'gif':
    case 'bmp':
    case 'ico': {
      const mime = format === 'ico' ? 'image/x-icon' : `image/${format}`;
      return { data: await decodeNative(buffer, mime), engine: 'native-bitmap' };
    }
    default:
      throw new Error(`Unsupported source format: ${format}`);
  }
}

/* ------------------------------------------------------------------ *
 * Optional resize (longest edge), pure jsquash/resize.
 * ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function drawToImageData(src: ImageData, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number): ImageData {
  const srcCanvas = new OffscreenCanvas(src.width, src.height);
  const sc = srcCanvas.getContext('2d');
  if (!sc) throw new Error('OffscreenCanvas 2D context unavailable');
  sc.putImageData(src, 0, 0);

  const out = new OffscreenCanvas(dw, dh);
  const oc = out.getContext('2d');
  if (!oc) throw new Error('OffscreenCanvas 2D context unavailable');
  oc.imageSmoothingEnabled = true;
  oc.imageSmoothingQuality = 'high';
  oc.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, dw, dh);
  return oc.getImageData(0, 0, dw, dh);
}

/** Crop to a rectangle of the original image (pixels), clamped to bounds. */
function cropImageData(data: ImageData, crop: { x: number; y: number; width: number; height: number }): ImageData {
  const sx = clamp(Math.round(crop.x), 0, data.width - 1);
  const sy = clamp(Math.round(crop.y), 0, data.height - 1);
  const sw = clamp(Math.round(crop.width), 1, data.width - sx);
  const sh = clamp(Math.round(crop.height), 1, data.height - sy);
  if (sx === 0 && sy === 0 && sw === data.width && sh === data.height) return data;
  return drawToImageData(data, sx, sy, sw, sh, sw, sh);
}

/** Resize to exact width × height (may change aspect ratio). */
function resizeExact(data: ImageData, w: number, h: number): ImageData {
  const tw = clamp(Math.round(w), 1, 16384);
  const th = clamp(Math.round(h), 1, 16384);
  if (tw === data.width && th === data.height) return data;
  return drawToImageData(data, 0, 0, data.width, data.height, tw, th);
}

async function maybeResize(data: ImageData, maxEdge?: number): Promise<ImageData> {
  if (!maxEdge || (data.width <= maxEdge && data.height <= maxEdge)) return data;
  const scale = maxEdge / Math.max(data.width, data.height);
  const width = Math.max(1, Math.round(data.width * scale));
  const height = Math.max(1, Math.round(data.height * scale));
  const mod = await cdnImport(VERSIONS.resize);
  return mod.default(data, { width, height });
}

/* ------------------------------------------------------------------ *
 * Encoding: ImageData -> bytes for the target format.
 * ------------------------------------------------------------------ */

/** Longest-edge downscale via canvas (no extra codec needed). */
function fitResize(data: ImageData, maxEdge: number): ImageData {
  const scale = maxEdge / Math.max(data.width, data.height);
  const w = Math.max(1, Math.round(data.width * scale));
  const h = Math.max(1, Math.round(data.height * scale));
  return drawToImageData(data, 0, 0, data.width, data.height, w, h);
}

/**
 * AVIF/JXL single-threaded WASM encoders can run out of memory on large images
 * (returns null -> "Encoding error"), and how large depends on the machine.
 * Retry at progressively smaller resolutions so the user always gets a file.
 */
async function encodeResilient(
  enc: (img: ImageData, fast: boolean) => Promise<ArrayBuffer | null>,
  data: ImageData,
): Promise<{ buffer: ArrayBuffer; width: number; height: number }> {
  const caps: Array<number | null> = [null, 4096, 2560, 1536];
  let lastErr: unknown;
  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i];
    let img = data;
    if (cap != null) {
      if (Math.max(data.width, data.height) <= cap) continue;
      img = fitResize(data, cap);
    }
    try {
      const buffer = await enc(img, i > 0);
      if (!buffer) throw new Error('Encoder returned null');
      return { buffer, width: img.width, height: img.height };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Encoding failed');
}

async function canvasEncode(data: ImageData, mime: string, quality: number): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(data.width, data.height);
  const c = canvas.getContext('2d');
  if (!c) throw new Error('OffscreenCanvas 2D context unavailable');
  c.putImageData(data, 0, 0);
  const blob = await canvas.convertToBlob({ type: mime, quality: quality / 100 });
  return blob.arrayBuffer();
}

async function encode(
  format: ImageFormat,
  data: ImageData,
  opts: ConvertOptions,
): Promise<{ buffer: ArrayBuffer; mime: string; engine: Engine; outWidth?: number; outHeight?: number }> {
  const q = opts.quality;
  switch (format) {
    case 'jpeg': {
      try {
        const mod = await cdnImport(VERSIONS.jpeg);
        return { buffer: await mod.encode(data, { quality: q }), mime: 'image/jpeg', engine: 'jsquash' };
      } catch {
        return { buffer: await canvasEncode(data, 'image/jpeg', q), mime: 'image/jpeg', engine: 'canvas' };
      }
    }
    case 'png': {
      try {
        const mod = await cdnImport(VERSIONS.oxipng);
        return { buffer: await mod.optimise(data, { level: opts.lossless ? 4 : 2 }), mime: 'image/png', engine: 'jsquash' };
      } catch {
        return { buffer: await canvasEncode(data, 'image/png', 100), mime: 'image/png', engine: 'canvas' };
      }
    }
    case 'webp': {
      try {
        const mod = await cdnImport(VERSIONS.webp);
        return {
          buffer: await mod.encode(data, opts.lossless ? { lossless: 1 } : { quality: q }),
          mime: 'image/webp',
          engine: 'jsquash',
        };
      } catch {
        return { buffer: await canvasEncode(data, 'image/webp', q), mime: 'image/webp', engine: 'canvas' };
      }
    }
    case 'avif': {
      const mod = await cdnImport(VERSIONS.avif);
      // This codec build uses cqLevel (0 = best … 63 = worst); map our 1–100 quality.
      const cqLevel = opts.lossless ? 0 : Math.round(((100 - q) / 100) * 63);
      const r = await encodeResilient((img, fast) => mod.encode(img, { cqLevel, speed: fast ? 9 : 6 }), data);
      return { buffer: r.buffer, mime: 'image/avif', engine: 'jsquash', outWidth: r.width, outHeight: r.height };
    }
    case 'jxl': {
      const mod = await cdnImport(VERSIONS.jxl);
      const jxlOpts = opts.lossless ? { lossless: true } : { quality: q };
      const r = await encodeResilient((img) => mod.encode(img, jxlOpts), data);
      return { buffer: r.buffer, mime: 'image/jxl', engine: 'jsquash', outWidth: r.width, outHeight: r.height };
    }
    case 'svg': {
      const { vectorize } = await import('@/lib/engines/vectorize');
      return { buffer: await vectorize(data), mime: 'image/svg+xml', engine: 'imagetracer' };
    }
    case 'gif': {
      const { encodeGif } = await import('@/lib/engines/gif');
      return { buffer: await encodeGif(data), mime: 'image/gif', engine: 'gifenc' };
    }
    case 'tiff': {
      const { encodeTiff } = await import('@/lib/engines/tiff');
      return { buffer: await encodeTiff(data), mime: 'image/tiff', engine: 'utif' };
    }
    case 'bmp': {
      const { encodeBmp } = await import('@/lib/engines/raster');
      return { buffer: encodeBmp(data), mime: 'image/bmp', engine: 'canvas' };
    }
    case 'ico': {
      const { encodeIco } = await import('@/lib/engines/raster');
      return { buffer: await encodeIco(data), mime: 'image/x-icon', engine: 'canvas' };
    }
    default:
      throw new Error(`Unsupported target format: ${format}`);
  }
}

/* ------------------------------------------------------------------ *
 * Job runner with honest, stage-based progress.
 * ------------------------------------------------------------------ */

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer, sourceFormat, targetFormat, options } = e.data;
  try {
    post({ id, type: 'progress', stage: 'decode', progress: 6 });
    const decoded = await decode(sourceFormat, buffer);
    post({ id, type: 'progress', stage: 'decode', progress: 38 });

    post({ id, type: 'progress', stage: 'process', progress: 46 });
    let processed = decoded.data;
    if (options.crop) processed = cropImageData(processed, options.crop);
    if (options.outputWidth && options.outputHeight) {
      processed = resizeExact(processed, options.outputWidth, options.outputHeight);
    } else {
      const effectiveMax = targetFormat === 'ico' ? Math.min(options.maxEdge ?? 256, 256) : options.maxEdge;
      processed = await maybeResize(processed, effectiveMax);
    }
    post({ id, type: 'progress', stage: 'process', progress: 54 });

    post({ id, type: 'progress', stage: 'encode', progress: 60 });
    const out = await encode(targetFormat, processed, options);
    post({ id, type: 'progress', stage: 'encode', progress: 100 });

    post(
      {
        id,
        type: 'done',
        buffer: out.buffer,
        mime: out.mime,
        width: out.outWidth ?? processed.width,
        height: out.outHeight ?? processed.height,
        engine: out.engine,
      },
      [out.buffer],
    );
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
