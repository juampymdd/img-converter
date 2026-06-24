'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useConversionStore } from '@/store/useConversionStore';
import { cn } from '@/lib/utils';

export function Dropzone() {
  const addFiles = useConversionStore((s) => s.addFiles);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) void addFiles(accepted);
    },
    [addFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'image/*': [],
      'image/heic': ['.heic', '.heif'],
      'image/jxl': ['.jxl'],
      'image/svg+xml': ['.svg'],
      'image/tiff': ['.tif', '.tiff'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'group relative grid place-items-center rounded-xl border-2 border-dashed px-6 py-12 text-center',
        // Only transform/opacity/colors animate; ease-out, fast.
        'transition-[border-color,background-color,transform] duration-200 ease-out',
        isDragActive
          ? 'scale-[1.01] border-accent bg-accent/5'
          : 'border-border bg-card/50 hover:border-muted-foreground/40',
      )}
    >
      <input {...getInputProps()} aria-label="Upload images" />
      <div className="pointer-events-none flex flex-col items-center gap-3">
        <div
          className={cn(
            'grid size-12 place-items-center rounded-full border border-border bg-background transition-transform duration-200 ease-out',
            isDragActive ? 'scale-110' : 'group-hover:scale-105',
          )}
        >
          <UploadCloud className={cn('size-6 transition-colors', isDragActive ? 'text-accent' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? 'Drop to add them' : 'Drag images here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or{' '}
            <button
              type="button"
              onClick={open}
              className="pointer-events-auto font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              browse files
            </button>{' '}
            · processed privately in your browser
          </p>
        </div>
      </div>
    </div>
  );
}
