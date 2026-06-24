import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Aperture — Image Converter',
  description:
    'Convert images between JPEG, PNG, WebP, AVIF, JPEG XL, HEIC, GIF, BMP, TIFF, ICO and SVG. Fast, private, in your browser.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <body className="font-sans">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{ classNames: { toast: 'font-sans' } }}
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
