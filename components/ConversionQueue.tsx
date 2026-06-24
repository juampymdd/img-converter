'use client';

import { AnimatePresence } from 'motion/react';
import { ArrowRight, Download, Trash2 } from 'lucide-react';
import { useConversionStore } from '@/store/useConversionStore';
import { FileCard } from '@/components/FileCard';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';

export function ConversionQueue() {
  const { items, startAll, downloadZip, clearCompleted, clearAll } = useConversionStore();

  if (items.length === 0) return null;

  const doneItems = items.filter((it) => it.status === 'done');
  const doneCount = doneItems.length;
  const queuedCount = items.filter((it) => it.status === 'queued').length;
  const activeCount = items.filter((it) => it.status === 'reading' || it.status === 'converting').length;
  const savedBytes = doneItems.reduce((acc, it) => acc + Math.max(0, it.file.size - (it.result?.size ?? it.file.size)), 0);

  return (
    <section aria-label="Conversion queue" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-lg font-semibold">Queue</h2>
          <p className="tnum text-sm tabular-nums text-muted-foreground">
            {doneCount}/{items.length} done
            {activeCount > 0 && <span className="text-accent"> · {activeCount} running</span>}
            {savedBytes > 0 && <span className="text-ok"> · {formatBytes(savedBytes)} saved</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <Button size="sm" variant="primary" onClick={startAll}>
              Convert {queuedCount} {queuedCount === 1 ? 'image' : 'images'}
              <ArrowRight className="size-4" />
            </Button>
          )}
          <Button size="sm" variant={queuedCount > 0 ? 'ghost' : 'primary'} onClick={() => void downloadZip()} disabled={doneCount === 0}>
            <Download className="size-4" /> Download .zip
          </Button>
          <Button size="sm" variant="ghost" onClick={clearCompleted} disabled={doneCount === 0}>
            Clear done
          </Button>
          <Button size="sm" variant="ghost" onClick={clearAll} aria-label="Clear all">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <FileCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
