'use client';

import { Check } from 'lucide-react';
import { useConversionStore } from '@/store/useConversionStore';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1, label: 'Add images', hint: 'Drag or browse' },
  { n: 2, label: 'Choose format', hint: 'Pick output + quality' },
  { n: 3, label: 'Convert', hint: 'Run & download' },
] as const;

function useCurrentStep(): number {
  const items = useConversionStore((s) => s.items);
  if (items.length === 0) return 1;
  const started = items.some((it) => it.status !== 'queued');
  return started ? 3 : 2;
}

export function Stepper() {
  const current = useCurrentStep();

  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Conversion steps">
      {STEPS.map((step, i) => {
        const isDone = step.n < current;
        const isActive = step.n === current;
        return (
          <li key={step.n} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                  'transition-colors duration-200 ease-out',
                  isDone && 'border-ok bg-ok text-white',
                  isActive && 'border-accent bg-accent text-accent-foreground',
                  !isDone && !isActive && 'border-border bg-card text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-4" /> : step.n}
              </span>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-medium leading-none transition-colors duration-200',
                    isActive || isDone ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{step.hint}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  'h-px flex-1 origin-left transition-colors duration-200 ease-out',
                  step.n < current ? 'bg-ok' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
