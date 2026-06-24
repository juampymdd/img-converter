'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Scissors, Crop as CropIcon, Lock } from 'lucide-react';
import { ALL_FORMATS, FORMATS } from '@/lib/formats';
import { Dropzone } from '@/components/Dropzone';
import { Stepper } from '@/components/Stepper';
import { ConversionQueue } from '@/components/ConversionQueue';
import { OptionsPanel } from '@/components/OptionsPanel';
import { MobileSettings } from '@/components/MobileSettings';
import { Button } from '@/components/ui/button';

const EASE = [0.23, 1, 0.32, 1] as const;

export function Studio() {
  const [started, setStarted] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {started ? (
        <motion.div
          key="workspace"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <Workspace onHome={() => setStarted(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <Hero onStart={() => setStarted(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-3xl flex-col items-center justify-center py-12 text-center">
      <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Convert any image,
        <br />
        <span className="text-accent">channel-precise</span> and private.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
        Eleven formats both ways, crop &amp; resize, and AI background removal — all on your device. Nothing is uploaded.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button size="lg" onClick={onStart} className="px-7">
          Open the converter
          <ArrowRight className="size-4" />
        </Button>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Lock className="size-3" /> 100% in-browser</span>
          <span className="inline-flex items-center gap-1"><CropIcon className="size-3" /> Crop &amp; resize</span>
          <span className="inline-flex items-center gap-1"><Scissors className="size-3" /> Remove background</span>
        </p>
      </div>

      <ul className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
        {ALL_FORMATS.map((f) => (
          <li
            key={f}
            className="tnum rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {FORMATS[f].label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Workspace({ onHome }: { onHome: () => void }) {
  return (
    <div className="py-8">
      <button
        type="button"
        onClick={onHome}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="size-4" /> Home
      </button>

      <div className="rounded-xl border border-border bg-card/60 px-4 py-3 sm:px-6">
        <Stepper />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Dropzone />
          <div className="lg:hidden">
            <MobileSettings />
          </div>
          <ConversionQueue />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Settings</h2>
            <div className="mt-4">
              <OptionsPanel />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
