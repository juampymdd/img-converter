'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import { CanceledError, convertFile } from '@/lib/converter';
import { detectFormat } from '@/lib/detectFormat';
import { FORMATS, defaultTargetFor, extOf } from '@/lib/formats';
import type { ConvertOptions, ImageFormat, QueueItem } from '@/lib/types';
import { uid } from '@/lib/utils';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_CONCURRENT = 3;

// AbortControllers live outside React state (not serializable).
const controllers = new Map<string, AbortController>();
let activeCount = 0;

interface ConversionState {
  items: QueueItem[];
  /** Defaults applied to newly added files and to "apply to all". */
  target: ImageFormat;
  options: ConvertOptions;

  addFiles: (files: File[]) => Promise<void>;
  /** Begin converting every file still waiting in the queue. */
  startAll: () => void;
  setTarget: (target: ImageFormat) => void;
  setOptions: (patch: Partial<ConvertOptions>) => void;
  setItemTarget: (id: string, target: ImageFormat) => void;
  /** Patch a single item's options (crop, exact output size, etc). */
  setItemOptions: (id: string, patch: Partial<ConvertOptions>) => void;
  /** Set (or clear) the cropped thumbnail preview for an item. */
  setItemCropPreview: (id: string, url: string | undefined) => void;
  /** Run AI background removal; replaces the source with a transparent PNG. */
  removeBackground: (id: string) => Promise<void>;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  downloadZip: () => Promise<void>;
}

function patchItem(set: SetFn, id: string, patch: Partial<QueueItem>) {
  set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
}

type SetFn = (fn: (s: ConversionState) => Partial<ConversionState>) => void;
type GetFn = () => ConversionState;

async function runItem(id: string, set: SetFn, get: GetFn) {
  const item = get().items.find((it) => it.id === id);
  if (!item) return;

  const controller = new AbortController();
  controllers.set(id, controller);
  activeCount += 1;
  patchItem(set, id, { status: 'reading', readProgress: 0, convertProgress: 0, error: undefined });

  try {
    const result = await convertFile(
      item.file,
      item.sourceFormat,
      item.targetFormat,
      item.options,
      {
        onRead: (pct) => patchItem(set, id, { status: 'reading', readProgress: pct }),
        onConvert: (stage, pct) => patchItem(set, id, { status: 'converting', stage, convertProgress: pct }),
      },
      controller.signal,
    );

    const url = URL.createObjectURL(result.blob);
    patchItem(set, id, {
      status: 'done',
      convertProgress: 100,
      result: { blob: result.blob, url, size: result.blob.size, width: result.width, height: result.height, engine: result.engine },
    });
  } catch (err) {
    if (err instanceof CanceledError) {
      patchItem(set, id, { status: 'canceled' });
    } else {
      const message = err instanceof Error ? err.message : 'Conversion failed';
      patchItem(set, id, { status: 'error', error: message });
      toast.error(`Couldn't convert ${item.file.name}`, { description: message });
    }
  } finally {
    controllers.delete(id);
    activeCount -= 1;
    tick(set, get);
  }
}

/** Start queued items up to the concurrency limit. */
function tick(set: SetFn, get: GetFn) {
  if (activeCount >= MAX_CONCURRENT) return;
  const next = get().items.find((it) => it.status === 'queued');
  if (!next) return;
  // Mark immediately so a second tick can't double-start it.
  patchItem(set, next.id, { status: 'reading' });
  void runItem(next.id, set, get);
  if (activeCount < MAX_CONCURRENT) tick(set, get);
}

export const useConversionStore = create<ConversionState>((set, get) => ({
  items: [],
  target: 'webp',
  options: { quality: 80, lossless: false },

  addFiles: async (files) => {
    const accepted: QueueItem[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is too large`, { description: 'Maximum file size is 100 MB.' });
        continue;
      }
      const sourceFormat = await detectFormat(file);
      if (!sourceFormat) {
        toast.error(`Unsupported file: ${file.name}`, { description: 'Could not identify a known image format.' });
        continue;
      }
      const { target, options } = get();
      const targetFormat = FORMATS[sourceFormat] ? target : defaultTargetFor(sourceFormat);
      accepted.push({
        id: uid(),
        file,
        previewUrl: URL.createObjectURL(file),
        sourceFormat,
        targetFormat,
        options: { ...options },
        status: 'queued',
        readProgress: 0,
        convertProgress: 0,
      });
    }
    if (accepted.length === 0) return;
    set((s) => ({ items: [...s.items, ...accepted] }));
    // No auto-start: the user picks a format first, then presses Convert.
    toast.success(`Added ${accepted.length} file${accepted.length > 1 ? 's' : ''}`, {
      description: 'Pick an output format, then convert.',
    });
  },

  startAll: () => tick(set, get),

  setTarget: (target) => {
    set((s) => ({
      target,
      items: s.items.map((it) =>
        it.status === 'queued' || it.status === 'error' || it.status === 'canceled' ? { ...it, targetFormat: target } : it,
      ),
    }));
  },

  setOptions: (patch) => {
    set((s) => ({
      options: { ...s.options, ...patch },
      items: s.items.map((it) =>
        it.status === 'queued' || it.status === 'error' || it.status === 'canceled'
          ? { ...it, options: { ...it.options, ...patch } }
          : it,
      ),
    }));
  },

  setItemTarget: (id, target) => patchItem(set, id, { targetFormat: target }),

  setItemOptions: (id, patch) =>
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, options: { ...it.options, ...patch } } : it)),
    })),

  setItemCropPreview: (id, url) =>
    set((s) => ({
      items: s.items.map((it) => {
        if (it.id !== id) return it;
        if (it.croppedPreviewUrl && it.croppedPreviewUrl !== url) URL.revokeObjectURL(it.croppedPreviewUrl);
        return { ...it, croppedPreviewUrl: url };
      }),
    })),

  removeBackground: async (id) => {
    const item = get().items.find((it) => it.id === id);
    if (!item || item.bgProcessing) return;

    patchItem(set, id, { bgProcessing: true, bgProgress: 0, error: undefined });
    try {
      const { removeBackground } = await import('@/lib/bgremove');
      const blob = await removeBackground(item.file, (pct) => patchItem(set, id, { bgProgress: pct }));

      const base = item.file.name.replace(/\.[^.]+$/, '');
      const file = new File([blob], `${base}.png`, { type: 'image/png' });

      // Replace the working source with the transparent PNG.
      URL.revokeObjectURL(item.previewUrl);
      if (item.croppedPreviewUrl) URL.revokeObjectURL(item.croppedPreviewUrl);

      // Background removal invalidates any prior crop; keep other options.
      const nextTarget: ImageFormat = ['jpeg', 'gif', 'bmp'].includes(item.targetFormat) ? 'png' : item.targetFormat;
      patchItem(set, id, {
        file,
        sourceFormat: 'png',
        previewUrl: URL.createObjectURL(file),
        croppedPreviewUrl: undefined,
        bgRemoved: true,
        bgProcessing: false,
        bgProgress: 100,
        targetFormat: nextTarget,
        options: { ...item.options, crop: undefined },
        status: 'queued',
      });
      if (nextTarget !== item.targetFormat) {
        toast.message('Switched to PNG', { description: 'The original target had no transparency.' });
      }
      toast.success('Background removed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Background removal failed';
      patchItem(set, id, { bgProcessing: false, error: message });
      toast.error('Could not remove background', { description: message });
    }
  },

  cancel: (id) => {
    controllers.get(id)?.abort();
  },

  retry: (id) => {
    const item = get().items.find((it) => it.id === id);
    if (!item) return;
    patchItem(set, id, { status: 'queued', error: undefined, convertProgress: 0, readProgress: 0, result: undefined });
    tick(set, get);
  },

  remove: (id) => {
    controllers.get(id)?.abort();
    const item = get().items.find((it) => it.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.croppedPreviewUrl) URL.revokeObjectURL(item.croppedPreviewUrl);
      if (item.result) URL.revokeObjectURL(item.result.url);
    }
    set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
  },

  clearCompleted: () => {
    set((s) => {
      const keep: QueueItem[] = [];
      for (const it of s.items) {
        if (it.status === 'done') {
          URL.revokeObjectURL(it.previewUrl);
          if (it.croppedPreviewUrl) URL.revokeObjectURL(it.croppedPreviewUrl);
          if (it.result) URL.revokeObjectURL(it.result.url);
        } else {
          keep.push(it);
        }
      }
      return { items: keep };
    });
  },

  clearAll: () => {
    for (const it of get().items) {
      controllers.get(it.id)?.abort();
      URL.revokeObjectURL(it.previewUrl);
      if (it.croppedPreviewUrl) URL.revokeObjectURL(it.croppedPreviewUrl);
      if (it.result) URL.revokeObjectURL(it.result.url);
    }
    set(() => ({ items: [] }));
  },

  downloadZip: async () => {
    const done = get().items.filter((it) => it.status === 'done' && it.result);
    if (done.length === 0) {
      toast.error('Nothing to download yet');
      return;
    }
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const used = new Map<string, number>();
    for (const it of done) {
      const base = it.file.name.replace(/\.[^.]+$/, '');
      const ext = extOf(it.targetFormat);
      let name = `${base}.${ext}`;
      const count = used.get(name) ?? 0;
      if (count > 0) name = `${base}-${count}.${ext}`;
      used.set(name, count + 1);
      zip.file(name, it.result!.blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${done.length} files`);
  },
}));
