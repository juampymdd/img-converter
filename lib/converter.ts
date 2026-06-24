import type { ConvertOptions, ConvertStage, Engine, ImageFormat, WorkerRequest, WorkerResponse } from './types';

export class CanceledError extends Error {
  constructor() {
    super('Canceled');
    this.name = 'CanceledError';
  }
}

/** Read a File into an ArrayBuffer, reporting genuine 0–100 progress. */
function readWithProgress(file: File, onProgress: (pct: number) => void, signal: AbortSignal): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new CanceledError());
    const reader = new FileReader();

    const onAbort = () => {
      reader.abort();
      reject(new CanceledError());
    };
    signal.addEventListener('abort', onAbort, { once: true });

    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = () => {
      signal.removeEventListener('abort', onAbort);
      onProgress(100);
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      reject(reader.error ?? new Error('File read failed'));
    };
    reader.readAsArrayBuffer(file);
  });
}

export interface ConvertResult {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  engine: Engine;
}

export interface ConvertCallbacks {
  onRead: (pct: number) => void;
  onConvert: (stage: ConvertStage, pct: number) => void;
}

/**
 * Full client pipeline for one file: read -> spawn worker -> decode/process/encode.
 * Cancelable at any point via the AbortSignal (terminates the worker).
 */
export async function convertFile(
  file: File,
  sourceFormat: ImageFormat,
  targetFormat: ImageFormat,
  options: ConvertOptions,
  callbacks: ConvertCallbacks,
  signal: AbortSignal,
): Promise<ConvertResult> {
  const buffer = await readWithProgress(file, callbacks.onRead, signal);

  const worker = new Worker(new URL('../workers/convert.worker.ts', import.meta.url), { type: 'module' });

  try {
    return await new Promise<ConvertResult>((resolve, reject) => {
      const onAbort = () => {
        worker.terminate();
        reject(new CanceledError());
      };
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          callbacks.onConvert(msg.stage, msg.progress);
        } else if (msg.type === 'done') {
          signal.removeEventListener('abort', onAbort);
          resolve({
            blob: new Blob([msg.buffer], { type: msg.mime }),
            mime: msg.mime,
            width: msg.width,
            height: msg.height,
            engine: msg.engine,
          });
        } else {
          signal.removeEventListener('abort', onAbort);
          reject(new Error(msg.message));
        }
      };
      worker.onerror = (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(new Error(e.message || 'Worker crashed'));
      };

      const req: WorkerRequest = { id: file.name, buffer, sourceFormat, targetFormat, options };
      worker.postMessage(req, [buffer]);
    });
  } finally {
    worker.terminate();
  }
}
