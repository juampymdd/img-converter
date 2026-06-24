/// <reference lib="webworker" />
// Background removal with the RMBG-1.4 segmentation model via transformers.js.
// Loaded from the CDN and forced single-threaded so onnxruntime never spawns a
// cross-origin Worker (which browsers block — see cdn.ts notes).
import { cdnImport } from '@/lib/engines/cdn';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

type Msg =
  | { type: 'progress'; progress: number; label: string }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; message: string };

function post(msg: Msg, transfer?: Transferable[]) {
  ctx.postMessage(msg, transfer ?? []);
}

const TRANSFORMERS = '@huggingface/transformers@3.3.3';

let pipelinePromise: Promise<{ tf: any; model: any; processor: any }> | null = null;

function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const tf = await cdnImport(TRANSFORMERS);
      tf.env.allowLocalModels = false;
      // No threads -> no nested worker; assets fetched over CORS from the CDN.
      tf.env.backends.onnx.wasm.numThreads = 1;

      const onProgress = (p: any) => {
        if (p && typeof p.progress === 'number') {
          post({ type: 'progress', progress: Math.min(99, Math.round(p.progress)), label: 'Downloading model' });
        }
      };

      let device = 'wasm';
      let dtype = 'q8';
      try {
        // navigator.gpu is present when WebGPU is available (much faster).
        if ((ctx.navigator as any)?.gpu) {
          device = 'webgpu';
          dtype = 'fp32';
        }
      } catch {
        /* stay on wasm */
      }

      let model;
      try {
        model = await tf.AutoModel.from_pretrained('briaai/RMBG-1.4', { device, dtype, progress_callback: onProgress });
      } catch {
        // Fall back to CPU/wasm if WebGPU init fails.
        model = await tf.AutoModel.from_pretrained('briaai/RMBG-1.4', { device: 'wasm', dtype: 'q8', progress_callback: onProgress });
      }
      const processor = await tf.AutoProcessor.from_pretrained('briaai/RMBG-1.4');
      return { tf, model, processor };
    })().catch((err) => {
      pipelinePromise = null;
      throw err;
    });
  }
  return pipelinePromise;
}

ctx.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer; mime: string }>) => {
  try {
    const { tf, model, processor } = await getPipeline();
    post({ type: 'progress', progress: 100, label: 'Removing background' });

    const blob = new Blob([e.data.buffer], { type: e.data.mime });
    const image = await tf.RawImage.fromBlob(blob);

    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });

    // output[0] is the alpha mask (1×H×W, 0..1). Scale to 0..255 and resize back.
    const mask = await tf.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

    // Compose: original RGB + mask as alpha.
    const rgba = image.rgba();
    const data: Uint8ClampedArray = new Uint8ClampedArray(rgba.data);
    const m: Uint8Array = mask.data;
    for (let i = 0; i < m.length; i++) data[i * 4 + 3] = m[i]!;

    const imageData = new ImageData(image.width, image.height);
    imageData.data.set(data);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const c = canvas.getContext('2d');
    if (!c) throw new Error('OffscreenCanvas 2D context unavailable');
    c.putImageData(imageData, 0, 0);
    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    const buffer = await pngBlob.arrayBuffer();

    post({ type: 'done', buffer }, [buffer]);
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : 'Background removal failed' });
  }
};
