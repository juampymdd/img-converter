// Bridge to the background-removal worker. Returns a transparent PNG Blob.
export function removeBackground(file: File, onProgress: (pct: number, label: string) => void): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (err) {
      reject(err);
      return;
    }

    const worker = new Worker(new URL('../workers/bgremove.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'progress') {
        onProgress(m.progress, m.label);
      } else if (m.type === 'done') {
        resolve(new Blob([m.buffer], { type: 'image/png' }));
        worker.terminate();
      } else {
        reject(new Error(m.message));
        worker.terminate();
      }
    };
    worker.onerror = (e) => {
      reject(new Error(e.message || 'Background-removal worker crashed'));
      worker.terminate();
    };

    worker.postMessage({ buffer, mime: file.type || 'image/png' }, [buffer]);
  });
}
