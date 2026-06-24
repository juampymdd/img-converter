'use client';

import { FORMATS } from '@/lib/formats';
import { useConversionStore } from '@/store/useConversionStore';
import { FormatSelector } from '@/components/FormatSelector';
import { QualitySlider } from '@/components/QualitySlider';
import { Switch } from '@/components/ui/switch';

export function OptionsPanel() {
  const { target, options, setTarget, setOptions } = useConversionStore();
  const meta = FORMATS[target];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="target-format" className="text-sm font-medium text-foreground">
          Output format
        </label>
        <FormatSelector id="target-format" value={target} onChange={setTarget} />
        <p className="text-xs text-muted-foreground">{meta.note}</p>
      </div>

      {meta.hasQuality && !options.lossless && (
        <QualitySlider value={options.quality} onChange={(v) => setOptions({ quality: v })} />
      )}

      {meta.hasLossless && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Lossless</p>
            <p className="text-xs text-muted-foreground">Perfect quality, larger file</p>
          </div>
          <Switch
            checked={options.lossless}
            onCheckedChange={(v) => setOptions({ lossless: v })}
            aria-label="Lossless encoding"
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="max-edge" className="text-sm font-medium text-foreground">
          Resize longest edge
        </label>
        <div className="flex items-center gap-2">
          <input
            id="max-edge"
            type="number"
            inputMode="numeric"
            min={16}
            placeholder="Original"
            value={options.maxEdge ?? ''}
            onChange={(e) => setOptions({ maxEdge: e.target.value ? Number(e.target.value) : undefined })}
            className="tnum h-9 w-full rounded-md border border-input bg-card px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <span className="text-sm text-muted-foreground">px</span>
        </div>
        <p className="text-xs text-muted-foreground">Leave empty to keep original dimensions</p>
      </div>

      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        Settings apply to all queued files. Each card can override its own format.
      </p>
    </div>
  );
}
