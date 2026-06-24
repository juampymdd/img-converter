import { fileTypeFromBuffer } from 'file-type';
import type { ImageFormat } from './types';

const MIME_TO_FORMAT: Record<string, ImageFormat> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/jxl': 'jxl',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'image/heic-sequence': 'heic',
  'image/svg+xml': 'svg',
};

const EXT_TO_FORMAT: Record<string, ImageFormat> = {
  jpg: 'jpeg', jpeg: 'jpeg', jfif: 'jpeg',
  png: 'png', webp: 'webp', avif: 'avif', jxl: 'jxl',
  gif: 'gif', bmp: 'bmp', dib: 'bmp', tif: 'tiff', tiff: 'tiff',
  ico: 'ico', heic: 'heic', heif: 'heic', svg: 'svg',
};

function looksLikeSvg(bytes: Uint8Array): boolean {
  // Skip leading whitespace / BOM, then look for "<?xml" or "<svg".
  const head = new TextDecoder('utf-8').decode(bytes.slice(0, 256)).trimStart().toLowerCase();
  return head.startsWith('<?xml') || head.startsWith('<svg') || head.includes('<svg');
}

/**
 * Detect by magic bytes first (never trust the browser-supplied MIME),
 * then fall back to the SVG text sniff and finally the filename extension.
 */
export async function detectFormat(file: File): Promise<ImageFormat | null> {
  const buf = new Uint8Array(await file.slice(0, 4100).arrayBuffer());

  const ft = await fileTypeFromBuffer(buf);
  if (ft) {
    const byMime = MIME_TO_FORMAT[ft.mime];
    if (byMime) return byMime;
    const byFtExt = EXT_TO_FORMAT[ft.ext];
    if (byFtExt) return byFtExt;
  }

  if (looksLikeSvg(buf)) return 'svg';

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext) {
    const byExt = EXT_TO_FORMAT[ext];
    if (byExt) return byExt;
  }

  return null;
}
