'use client';

import { cn } from '@/lib/utils';

type Tone = 'read' | 'convert' | 'done' | 'idle';

interface Props {
  value: number; // 0–100
  label: string;
  tone?: Tone;
  className?: string;
}

const TONE_FILL: Record<Tone, string> = {
  read: 'bg-channel-b',
  convert: 'bg-accent',
  done: 'bg-ok',
  idle: 'bg-muted-foreground/40',
};

/**
 * Instrument-style meter. The fill animates with scaleX (transform only),
 * so it stays on the compositor and retargets smoothly mid-transition.
 */
export function ProgressBar({ value, label, tone = 'convert', className }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="tnum text-[11px] tabular-nums text-muted-foreground">{Math.round(clamped)}%</span>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('absolute inset-0 origin-left rounded-full transition-transform duration-300 ease-out', TONE_FILL[tone])}
          style={{ transform: `scaleX(${clamped / 100})`, willChange: 'transform' }}
        />
      </div>
    </div>
  );
}
