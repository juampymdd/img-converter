'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Crop as CropIcon, Download, RotateCcw, Scissors, X } from 'lucide-react';
import { FORMATS, extOf } from '@/lib/formats';
import type { ImageFormat, QueueItem } from '@/lib/types';
import { useConversionStore } from '@/store/useConversionStore';
import { cn, formatBytes, reductionPct } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormatSelector } from '@/components/FormatSelector';
import { ProgressBar } from '@/components/ProgressBar';
import { CropEditor } from '@/components/CropEditor';

const STAGE_LABEL: Record<string, string> = { decode: 'Decoding', process: 'Resizing', encode: 'Encoding' };

// Sources the browser can render in <img> for the crop preview.
const CROPPABLE = new Set<ImageFormat>(['jpeg', 'png', 'webp', 'gif', 'bmp', 'avif']);

export function FileCard({ item }: { item: QueueItem }) {
  const { cancel, retry, remove, setItemTarget, removeBackground } = useConversionStore();
  const [cropOpen, setCropOpen] = useState(false);
  const busy = item.status === 'reading' || item.status === 'converting';
  const editable = item.status === 'queued' || item.status === 'error' || item.status === 'canceled';
  const canCrop = editable && CROPPABLE.has(item.sourceFormat);
  const crop = item.options.crop;
  const outW = item.options.outputWidth;
  const outH = item.options.outputHeight;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="flex gap-4 rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4"
    >
      {/* Preview (click to crop when supported) */}
      <button
        type="button"
        onClick={() => canCrop && setCropOpen(true)}
        disabled={!canCrop}
        aria-label={canCrop ? `Crop ${item.file.name}` : item.file.name}
        className={cn(
          'group/preview relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:size-20',
          canCrop && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {/* Checkerboard hints at transparency support. */}
        <div className="absolute inset-0 [background-image:repeating-conic-gradient(hsl(var(--muted-foreground)/0.12)_0_25%,transparent_0_50%)] [background-size:12px_12px]" />
        {item.sourceFormat !== 'svg' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.croppedPreviewUrl ?? item.previewUrl}
            alt={item.file.name}
            className="relative size-full object-contain"
          />
        ) : (
          <div className="relative flex size-full items-center justify-center text-[10px] font-medium text-muted-foreground">
            SVG
          </div>
        )}
        {canCrop && (
          <span className="absolute inset-0 hidden place-items-center bg-black/40 opacity-0 transition-opacity duration-150 ease-out [@media(hover:hover)]:grid group-hover/preview:opacity-100">
            <CropIcon className="size-5 text-white" />
          </span>
        )}
      </button>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.file.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium uppercase">{FORMATS[item.sourceFormat].label}</span>
              <ArrowRight className="size-3" />
              <span className="font-medium uppercase text-foreground">{FORMATS[item.targetFormat].label}</span>
              <span className="tnum tabular-nums">· {formatBytes(item.file.size)}</span>
            </div>
          </div>
          <StatusBadge status={item.status} stage={item.stage} />
        </div>

        {/* Per-item target picker + crop when not yet running. */}
        {editable && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <div className="w-[160px]">
              <FormatSelector compact value={item.targetFormat} onChange={(f) => setItemTarget(item.id, f)} />
            </div>
            {canCrop && (
              <Button size="sm" variant="outline" onClick={() => setCropOpen(true)} disabled={item.bgProcessing}>
                <CropIcon className="size-4" /> {crop || (outW && outH) ? 'Edit crop' : 'Crop'}
              </Button>
            )}
            {canCrop && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void removeBackground(item.id)}
                disabled={item.bgProcessing}
              >
                <Scissors className="size-4" /> {item.bgRemoved ? 'Redo bg' : 'Remove bg'}
              </Button>
            )}
            {(crop || (outW && outH)) && (
              <span className="tnum inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-medium tabular-nums text-accent">
                {crop && `✂ ${crop.width}×${crop.height}`}
                {outW && outH && `${crop ? ' · ' : ''}→ ${outW}×${outH}`}
              </span>
            )}
            {item.bgRemoved && !item.bgProcessing && (
              <span className="inline-flex items-center gap-1 rounded-md bg-ok/10 px-2 py-1 text-[11px] font-medium text-ok">
                <Check className="size-3" /> Background removed
              </span>
            )}
          </div>
        )}

        {/* Background-removal progress (model download + inference). */}
        {item.bgProcessing && (
          <div className="mt-3">
            <ProgressBar label="Removing background" tone="convert" value={item.bgProgress ?? 0} />
            <p className="mt-1 text-[11px] text-muted-foreground">First run downloads the model (~40 MB), then it&apos;s cached.</p>
          </div>
        )}

        {canCrop && <CropEditor item={item} open={cropOpen} onOpenChange={setCropOpen} />}

        {/* Dual real progress meters. */}
        {(busy || item.status === 'queued') && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ProgressBar label="Read" tone={item.readProgress >= 100 ? 'done' : 'read'} value={item.readProgress} />
            <ProgressBar
              label={item.status === 'converting' && item.stage ? STAGE_LABEL[item.stage]! : 'Transform'}
              tone="convert"
              value={item.convertProgress}
            />
          </div>
        )}

        {/* Result summary. */}
        {item.status === 'done' && item.result && (
          <ResultSummary originalSize={item.file.size} item={item} />
        )}

        {item.status === 'error' && <p className="mt-2 text-xs text-danger">{item.error}</p>}

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          {busy && (
            <Button size="sm" variant="ghost" onClick={() => cancel(item.id)}>
              <X className="size-4" /> Cancel
            </Button>
          )}
          {(item.status === 'error' || item.status === 'canceled') && (
            <Button size="sm" variant="secondary" onClick={() => retry(item.id)}>
              <RotateCcw className="size-4" /> Retry
            </Button>
          )}
          {item.status === 'done' && item.result && (
            <Button size="sm" variant="primary" asChild>
              <a href={item.result.url} download={`${item.file.name.replace(/\.[^.]+$/, '')}.${extOf(item.targetFormat)}`}>
                <Download className="size-4" /> Download
              </a>
            </Button>
          )}
          {!busy && (
            <Button size="sm" variant="ghost" onClick={() => remove(item.id)} aria-label={`Remove ${item.file.name}`}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ResultSummary({ originalSize, item }: { originalSize: number; item: QueueItem }) {
  const size = item.result!.size;
  const pct = reductionPct(originalSize, size);
  const smaller = pct >= 0;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="tnum tabular-nums text-muted-foreground">
        {formatBytes(originalSize)} <ArrowRight className="inline size-3" /> {' '}
        <span className="font-medium text-foreground">{formatBytes(size)}</span>
      </span>
      <span
        className={cn(
          'tnum inline-flex items-center rounded-full px-2 py-0.5 font-medium tabular-nums',
          smaller ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn',
        )}
      >
        {smaller ? `−${pct}%` : `+${Math.abs(pct)}%`}
      </span>
      <span className="tnum tabular-nums text-muted-foreground">
        {item.result!.width}×{item.result!.height}
      </span>
    </div>
  );
}

function StatusBadge({ status, stage }: { status: QueueItem['status']; stage?: string }) {
  const map: Record<QueueItem['status'], { label: string; cls: string }> = {
    queued: { label: 'Queued', cls: 'bg-muted text-muted-foreground' },
    reading: { label: 'Reading', cls: 'bg-channel-b/10 text-channel-b' },
    converting: { label: stage ? STAGE_LABEL[stage]! : 'Converting', cls: 'bg-accent/10 text-accent' },
    done: { label: 'Done', cls: 'bg-ok/10 text-ok' },
    error: { label: 'Error', cls: 'bg-danger/10 text-danger' },
    canceled: { label: 'Canceled', cls: 'bg-muted text-muted-foreground' },
  };
  const { label, cls } = map[status];
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', cls)}>
      {status === 'done' && <Check className="size-3" />}
      {label}
    </span>
  );
}
