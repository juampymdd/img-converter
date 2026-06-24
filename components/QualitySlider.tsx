'use client';

import { Slider } from '@/components/ui/slider';

interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function QualitySlider({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="quality" className="text-sm font-medium text-foreground">
          Quality
        </label>
        <span className="tnum text-sm tabular-nums text-muted-foreground">{value}</span>
      </div>
      <Slider
        id="quality"
        min={1}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? value)}
        disabled={disabled}
        aria-valuetext={`${value} of 100`}
      />
    </div>
  );
}
