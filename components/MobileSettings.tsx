'use client';

import { Drawer } from 'vaul';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptionsPanel } from '@/components/OptionsPanel';

export function MobileSettings() {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <Button variant="outline" size="md" className="w-full">
          <SlidersHorizontal className="size-4" /> Conversion settings
        </Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        {/* Vaul handles the translateY(100%) -> 0 drawer curve. */}
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-card outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="overflow-y-auto p-5">
            <Drawer.Title className="font-display text-lg font-semibold">Conversion settings</Drawer.Title>
            <Drawer.Description className="sr-only">Choose output format and quality options.</Drawer.Description>
            <div className="mt-4">
              <OptionsPanel />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
