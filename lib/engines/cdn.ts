// WASM codec libraries are loaded at runtime from the esm.sh CDN rather than
// bundled. Emscripten glue (jsquash, resvg, libheif, wasm-vips) does not survive
// Next's SWC client transform, so we keep it out of the build entirely.
//
// `webpackIgnore` tells webpack to emit a native dynamic import the browser
// resolves itself. esm.sh serves these modules (and their sibling .wasm files)
// with permissive CORS, so they load fine. The codecs run SINGLE-THREADED:
// we deliberately omit COOP/COEP isolation (see next.config.mjs) because the
// multithreaded jsquash encoders spawn a nested Worker from the CDN URL, and
// cross-origin Worker construction is blocked by browsers.

export const ESM = 'https://esm.sh';

/** Dynamic, build-ignored CDN import. Returns the module namespace. */
export function cdnImport(spec: string): Promise<any> {
  return import(/* webpackIgnore: true */ `${ESM}/${spec}`);
}

/** Pinned versions, single source of truth. */
export const VERSIONS = {
  jpeg: '@jsquash/jpeg@1.4.0',
  png: '@jsquash/png@3.0.1',
  webp: '@jsquash/webp@1.4.0',
  avif: '@jsquash/avif@1.3.0',
  jxl: '@jsquash/jxl@1.2.0',
  oxipng: '@jsquash/oxipng@2.2.0',
  resize: '@jsquash/resize@2.1.0',
  resvg: '@resvg/resvg-wasm@2.6.2',
  libheif: 'libheif-js@1.18.2/wasm-bundle',
  // TIFF/GIF use pure-JS libs (no Web Workers) so they load fine from a CDN.
  // wasm-vips was dropped: it spawns a cross-origin Worker, which browsers block.
  utif: 'utif@3.1.0',
  gifenc: 'gifenc@1.0.3',
  imagetracer: 'imagetracerjs@1.2.6',
  svgo: 'svgo@3.3.2?bundle',
} as const;
