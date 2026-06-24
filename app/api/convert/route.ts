import type { NextRequest } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Formats sharp (libvips) can write. Client handles jxl/heic/ico/bmp/svg-out.
const SHARP_TARGETS = ['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff'] as const;
type SharpTarget = (typeof SHARP_TARGETS)[number];

const MIME: Record<SharpTarget, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tiff: 'image/tiff',
};

function encodeTo(pipeline: sharp.Sharp, target: SharpTarget, quality: number, lossless: boolean) {
  switch (target) {
    case 'jpeg': return pipeline.jpeg({ quality, mozjpeg: true });
    case 'png': return pipeline.png({ compressionLevel: 9 });
    case 'webp': return pipeline.webp(lossless ? { lossless: true } : { quality });
    case 'avif': return pipeline.avif(lossless ? { lossless: true } : { quality });
    case 'gif': return pipeline.gif();
    case 'tiff': return pipeline.tiff({ quality });
  }
}

/**
 * Optional server path for large batches / heavy loads.
 * Streams Server-Sent Events: `progress` stages, then a final `done` (base64) or `error`.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const form = await req.formData();
  const file = form.get('file');
  const target = String(form.get('target') ?? '') as SharpTarget;
  const quality = Number(form.get('quality') ?? 80);
  const lossless = form.get('lossless') === 'true';
  const maxEdge = form.get('maxEdge') ? Number(form.get('maxEdge')) : undefined;

  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing file' }, { status: 400 });
  }
  if (!SHARP_TARGETS.includes(target)) {
    return Response.json({ error: `Server can't encode "${target}". Use the in-browser pipeline.` }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      try {
        send('progress', { stage: 'decode', progress: 20 });
        let pipeline = sharp(input, { animated: target === 'gif' });
        if (maxEdge) pipeline = pipeline.resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true });

        send('progress', { stage: 'encode', progress: 60 });
        const out = await encodeTo(pipeline, target, quality, lossless).toBuffer();

        send('progress', { stage: 'encode', progress: 100 });
        send('done', { mime: MIME[target], size: out.length, data: out.toString('base64') });
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'Conversion failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
