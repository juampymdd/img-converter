// SVG -> raster via @resvg/resvg-wasm (loaded from CDN, see cdn.ts).
import { cdnImport, ESM, VERSIONS } from './cdn';

let ready: Promise<void> | null = null;
let ResvgCtor: any = null;

export function initResvg(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const mod = await cdnImport(VERSIONS.resvg);
      ResvgCtor = mod.Resvg;
      await mod.initWasm(fetch(`${ESM}/${VERSIONS.resvg}/index_bg.wasm`));
    })().catch((err) => {
      ready = null; // allow retry on a later file
      throw err;
    });
  }
  return ready;
}

export async function renderSvgToImageData(buffer: ArrayBuffer): Promise<ImageData> {
  const svg = new TextDecoder('utf-8').decode(buffer);
  const resvg = new ResvgCtor(svg, { fitTo: { mode: 'width', value: Math.min(intrinsicWidth(svg), 4096) } });
  const rendered = resvg.render();
  const png: Uint8Array = rendered.asPng();
  const bitmap = await createImageBitmap(new Blob([png as unknown as BlobPart], { type: 'image/png' }));
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const c = canvas.getContext('2d');
    if (!c) throw new Error('OffscreenCanvas 2D context unavailable');
    c.drawImage(bitmap, 0, 0);
    return c.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
    rendered.free();
    resvg.free();
  }
}

function intrinsicWidth(svg: string): number {
  const w = svg.match(/<svg[^>]*\bwidth=["']?([\d.]+)/i);
  if (w && w[1]) return Math.round(parseFloat(w[1]));
  const vb = svg.match(/viewBox=["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)/i);
  if (vb && vb[1]) return Math.round(parseFloat(vb[1]));
  return 1024;
}
