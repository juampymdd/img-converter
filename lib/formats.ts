import type { ImageFormat } from './types';

export interface FormatMeta {
  id: ImageFormat;
  label: string;
  ext: string;
  mime: string;
  /** Can the client pipeline read this format into pixels? */
  canDecode: boolean;
  /** Can the client pipeline write this format? */
  canEncode: boolean;
  /** Exposes the quality slider when chosen as a target. */
  hasQuality: boolean;
  /** Exposes the lossless toggle when chosen as a target. */
  hasLossless: boolean;
  /** Short note shown in the format picker. */
  note: string;
}

export const FORMATS: Record<ImageFormat, FormatMeta> = {
  jpeg: { id: 'jpeg', label: 'JPEG', ext: 'jpg', mime: 'image/jpeg', canDecode: true, canEncode: true, hasQuality: true, hasLossless: false, note: 'Universal photo format' },
  png: { id: 'png', label: 'PNG', ext: 'png', mime: 'image/png', canDecode: true, canEncode: true, hasQuality: false, hasLossless: true, note: 'Lossless, optimized via oxipng' },
  webp: { id: 'webp', label: 'WebP', ext: 'webp', mime: 'image/webp', canDecode: true, canEncode: true, hasQuality: true, hasLossless: true, note: 'Smaller than JPEG/PNG' },
  avif: { id: 'avif', label: 'AVIF', ext: 'avif', mime: 'image/avif', canDecode: true, canEncode: true, hasQuality: true, hasLossless: true, note: 'Best modern compression' },
  jxl: { id: 'jxl', label: 'JPEG XL', ext: 'jxl', mime: 'image/jxl', canDecode: true, canEncode: true, hasQuality: true, hasLossless: true, note: 'Next-gen, limited browser view' },
  gif: { id: 'gif', label: 'GIF', ext: 'gif', mime: 'image/gif', canDecode: true, canEncode: true, hasQuality: false, hasLossless: false, note: 'First frame, 256 colors' },
  bmp: { id: 'bmp', label: 'BMP', ext: 'bmp', mime: 'image/bmp', canDecode: true, canEncode: true, hasQuality: false, hasLossless: true, note: 'Uncompressed bitmap' },
  tiff: { id: 'tiff', label: 'TIFF', ext: 'tiff', mime: 'image/tiff', canDecode: true, canEncode: true, hasQuality: false, hasLossless: true, note: 'Uncompressed RGBA' },
  ico: { id: 'ico', label: 'ICO', ext: 'ico', mime: 'image/x-icon', canDecode: true, canEncode: true, hasQuality: false, hasLossless: true, note: 'Favicons; capped at 256px' },
  heic: { id: 'heic', label: 'HEIC / HEIF', ext: 'heic', mime: 'image/heic', canDecode: true, canEncode: false, hasQuality: false, hasLossless: false, note: 'Apple photos — decode only' },
  svg: { id: 'svg', label: 'SVG', ext: 'svg', mime: 'image/svg+xml', canDecode: true, canEncode: true, hasQuality: false, hasLossless: false, note: 'Rasterize in / vectorize out' },
};

export const ALL_FORMATS: ImageFormat[] = Object.keys(FORMATS) as ImageFormat[];

/** Targets offered for a given source — anything we can encode. */
export const ENCODABLE_TARGETS: ImageFormat[] = ALL_FORMATS.filter((f) => FORMATS[f].canEncode);

export function defaultTargetFor(source: ImageFormat): ImageFormat {
  // Sensible, non-lossy-by-default suggestions.
  if (source === 'png' || source === 'svg') return 'webp';
  if (source === 'heic' || source === 'tiff' || source === 'bmp') return 'jpeg';
  if (source === 'jpeg') return 'webp';
  return 'png';
}

export function extOf(format: ImageFormat): string {
  return FORMATS[format].ext;
}
