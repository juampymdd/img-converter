import { Lock } from 'lucide-react';
import { Studio } from '@/components/Studio';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SUPPORTED_FORMATS,
} from '@/lib/site';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (web browser)',
  browserRequirements: 'Requires JavaScript and WebAssembly.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: SUPPORTED_FORMATS.map((f) => `Convert to/from ${f}`),
  isAccessibleForFree: true,
};

export default function Home() {
  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="sr-only">
        {SITE_NAME} — {SITE_TAGLINE}: convert {SUPPORTED_FORMATS.join(', ')} images
        privately in your browser
      </h1>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Aperture />
            <span className="font-display text-base font-semibold tracking-tight">Aperture</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Lock className="size-3.5" /> Runs in your browser
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Studio />
      </main>
    </div>
  );
}

/** Signature mark: an aperture iris built from the three additive channels. */
function Aperture() {
  return (
    <span className="relative grid size-7 place-items-center">
      <span className="absolute size-5 rounded-full bg-channel-r/80 mix-blend-screen [transform:translate(-3px,2px)]" />
      <span className="absolute size-5 rounded-full bg-channel-g/80 mix-blend-screen [transform:translate(3px,2px)]" />
      <span className="absolute size-5 rounded-full bg-channel-b/80 mix-blend-screen [transform:translate(0,-3px)]" />
      <span className="absolute size-2 rounded-full bg-background" />
    </span>
  );
}
