// Central site metadata. Override the base URL per-environment with
// NEXT_PUBLIC_SITE_URL (e.g. a preview deploy) without touching code.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://img-converter.juampymad.com'
).replace(/\/$/, '');

export const SITE_NAME = 'img-converter';

export const SITE_TAGLINE = 'Free Online Image Converter';

export const SITE_DESCRIPTION =
  'Convert images between JPEG, PNG, WebP, AVIF, JPEG XL, HEIC, GIF, BMP, TIFF, ICO and SVG. 100% free, private, and fast — every conversion runs in your browser, no upload required.';

// Primary keyword targets for the converter.
export const SITE_KEYWORDS = [
  'image converter',
  'convert images online',
  'free image converter',
  'JPEG to PNG',
  'PNG to WebP',
  'WebP converter',
  'AVIF converter',
  'HEIC to JPEG',
  'JPEG XL converter',
  'SVG converter',
  'browser image converter',
  'private image converter',
  'no upload image converter',
];

export const SUPPORTED_FORMATS = [
  'JPEG',
  'PNG',
  'WebP',
  'AVIF',
  'JPEG XL',
  'HEIC',
  'GIF',
  'BMP',
  'TIFF',
  'ICO',
  'SVG',
];
