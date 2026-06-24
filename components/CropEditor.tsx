'use client';

import { useRef, useState } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { CropRect, QueueItem } from '@/lib/types';
import { useConversionStore } from '@/store/useConversionStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface Props {
  item: QueueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Preset {
  label: string;
  value: number | undefined;
}
const PRESETS: Preset[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:1', value: 3 },
];

function centeredCrop(aspect: number | undefined, nw: number, nh: number): Crop {
  if (!aspect) return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, nw, nh), nw, nh);
}

export function CropEditor({ item, open, onOpenChange }: Props) {
  const setItemOptions = useConversionStore((s) => s.setItemOptions);
  const setItemCropPreview = useConversionStore((s) => s.setItemCropPreview);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [exact, setExact] = useState<boolean>(Boolean(item.options.outputWidth && item.options.outputHeight));
  const [out, setOut] = useState<{ w: number; h: number } | null>(
    item.options.outputWidth && item.options.outputHeight
      ? { w: item.options.outputWidth, h: item.options.outputHeight }
      : null,
  );

  // Natural-pixel crop derived from the percent crop + image natural size.
  const pxCrop: CropRect | null =
    crop && nat
      ? {
          x: Math.round(((crop.x ?? 0) / 100) * nat.w),
          y: Math.round(((crop.y ?? 0) / 100) * nat.h),
          width: Math.round(((crop.width ?? 0) / 100) * nat.w),
          height: Math.round(((crop.height ?? 0) / 100) * nat.h),
        }
      : null;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    // Restore an existing crop, else default to full-image free crop.
    if (item.options.crop) {
      const c = item.options.crop;
      setCrop({
        unit: '%',
        x: (c.x / img.naturalWidth) * 100,
        y: (c.y / img.naturalHeight) * 100,
        width: (c.width / img.naturalWidth) * 100,
        height: (c.height / img.naturalHeight) * 100,
      });
    } else {
      setCrop(centeredCrop(undefined, img.naturalWidth, img.naturalHeight));
    }
  }

  function applyPreset(p: Preset) {
    setAspect(p.value);
    if (nat) setCrop(centeredCrop(p.value, nat.w, nat.h));
  }

  function setPxField(field: keyof CropRect, value: number) {
    if (!nat || !pxCrop) return;
    const next = { ...pxCrop, [field]: value };
    setCrop({
      unit: '%',
      x: (next.x / nat.w) * 100,
      y: (next.y / nat.h) * 100,
      width: (next.width / nat.w) * 100,
      height: (next.height / nat.h) * 100,
    });
  }

  function makeCropThumb(c: CropRect) {
    const img = imgRef.current;
    if (!img) return;
    const longest = Math.max(c.width, c.height);
    const scale = longest > 256 ? 256 / longest : 1;
    const cw = Math.max(1, Math.round(c.width * scale));
    const ch = Math.max(1, Math.round(c.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, c.x, c.y, c.width, c.height, 0, 0, cw, ch);
    canvas.toBlob((b) => {
      if (b) setItemCropPreview(item.id, URL.createObjectURL(b));
    }, 'image/png');
  }

  function handleApply() {
    if (!pxCrop || pxCrop.width < 1 || pxCrop.height < 1) {
      onOpenChange(false);
      return;
    }
    const isFull = Boolean(
      pxCrop.x === 0 && pxCrop.y === 0 && nat && pxCrop.width === nat.w && pxCrop.height === nat.h,
    );
    setItemOptions(item.id, {
      crop: isFull ? undefined : pxCrop,
      outputWidth: exact && out ? out.w : undefined,
      outputHeight: exact && out ? out.h : undefined,
    });
    if (isFull) setItemCropPreview(item.id, undefined);
    else makeCropThumb(pxCrop);
    onOpenChange(false);
  }

  function handleReset() {
    setItemOptions(item.id, { crop: undefined, outputWidth: undefined, outputHeight: undefined });
    setItemCropPreview(item.id, undefined);
    setAspect(undefined);
    setExact(false);
    setOut(null);
    if (nat) setCrop(centeredCrop(undefined, nat.w, nat.h));
  }

  const cropAspect = pxCrop && pxCrop.height > 0 ? pxCrop.width / pxCrop.height : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>Crop & resize</DialogTitle>
        <DialogDescription>Drag the box, pick a ratio, or type exact pixels.</DialogDescription>

        <div className="grid gap-5 sm:grid-cols-[1fr_240px]">
          {/* Crop surface */}
          <div className="grid max-h-[55vh] place-items-center overflow-hidden rounded-lg border border-border bg-muted/40 p-2">
            <ReactCrop
              crop={crop}
              onChange={(_px, percent) => setCrop(percent)}
              aspect={aspect}
              ruleOfThirds
              className="max-h-[50vh]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={item.previewUrl}
                alt={item.file.name}
                onLoad={onImageLoad}
                className="max-h-[50vh] w-auto object-contain"
              />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Aspect ratio</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-out',
                      aspect === p.value
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumField label="X" value={pxCrop?.x ?? 0} onChange={(v) => setPxField('x', v)} />
              <NumField label="Y" value={pxCrop?.y ?? 0} onChange={(v) => setPxField('y', v)} />
              <NumField label="Width" value={pxCrop?.width ?? 0} onChange={(v) => setPxField('width', v)} />
              <NumField label="Height" value={pxCrop?.height ?? 0} onChange={(v) => setPxField('height', v)} />
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Exact output size</p>
                  <p className="text-xs text-muted-foreground">Rescale crop to fixed px</p>
                </div>
                <Switch
                  checked={exact}
                  onCheckedChange={(v) => {
                    setExact(v);
                    if (v && !out && pxCrop) setOut({ w: pxCrop.width, h: pxCrop.height });
                  }}
                  aria-label="Exact output size"
                />
              </div>
              {exact && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <NumField
                    label="Out W"
                    value={out?.w ?? pxCrop?.width ?? 0}
                    onChange={(w) => setOut({ w, h: Math.round(w / cropAspect) })}
                  />
                  <NumField
                    label="Out H"
                    value={out?.h ?? pxCrop?.height ?? 0}
                    onChange={(h) => setOut({ w: Math.round(h * cropAspect), h })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
        className="tnum h-8 w-full rounded-md border border-input bg-card px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </label>
  );
}
