# img-converter — Free Online Image Converter

Professional, **client-first** image converter. All decoding, resizing and
re-encoding runs in your browser via WebAssembly inside Web Workers — nothing is
uploaded. An optional server path (sharp) exists for heavy batches.

Built with Next.js (App Router + RSC), TypeScript (strict), Tailwind, Radix/shadcn
primitives, Motion, Sonner, Vaul, Zustand, react-dropzone, file-type and JSZip.

---

## Install & run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
npm run typecheck
```

Node 18.18+ (tested on Node 22). Codecs load from the esm.sh CDN and run
**single-threaded**. We intentionally do **not** set COOP/COEP isolation headers:
isolation makes jsquash pick its multithreaded encoders, which spawn a nested
Worker from the CDN URL — and browsers block cross-origin Worker construction.
To enable multithreading you would self-host the codecs same-origin.

> **WASM serving:** `next.config.mjs` enables `experiments.asyncWebAssembly` and
> emits `.wasm` as static assets. Run dev/build with **webpack** (the default).
> If you opt into Turbopack, port the `.wasm` asset rule accordingly.

---

## Supported formats

| Format   | Read (decode) | Write (encode) | Engine (client)                |
| -------- | :-----------: | :------------: | ------------------------------ |
| JPEG     | ✅            | ✅             | @jsquash/jpeg (canvas fallback)|
| PNG      | ✅            | ✅             | @jsquash/png + oxipng          |
| WebP     | ✅            | ✅             | @jsquash/webp                  |
| AVIF     | ✅            | ✅             | @jsquash/avif                  |
| JPEG XL  | ✅            | ✅             | @jsquash/jxl                   |
| GIF      | ✅ (frame 1)  | ✅             | native decode / gifenc         |
| BMP      | ✅            | ✅             | native decode / custom encoder |
| TIFF     | ✅            | ✅             | UTIF.js                        |
| ICO      | ✅            | ✅ (≤256px)    | native decode / PNG-in-ICO     |
| HEIC/HEIF| ✅            | ➖ decode only | native bitmap → libheif-js     |
| SVG      | ✅ rasterize  | ✅ vectorize   | @resvg/resvg-wasm / imagetracer+svgo |

### Conversion matrix

Any **readable** format → any **writable** format. That's 11 sources × 10 targets.
Examples that exercise every engine:

- `HEIC → JPEG` (Apple photos, native fast-path or libheif fallback)
- `PNG → AVIF` / `→ JPEG XL` (modern compression)
- `SVG → PNG` (rasterize) and `PNG → SVG` (vectorize → SVGO)
- `TIFF → WebP`, `JPEG → ICO`, `GIF → PNG`, `BMP → WebP`

HEIC is decode-only (no royalty-free HEIC encoder ships in the browser).

---

## How it works

### Pipeline (client, primary)

```
File ─▶ detectFormat (magic bytes, file-type)
     ─▶ FileReader  ........... real 0–100% READ progress
     ─▶ Web Worker
          decode  ─▶ ImageData     (lazy dynamic import of the codec)
          resize  ─▶ ImageData     (@jsquash/resize, optional longest-edge)
          encode  ─▶ bytes         } real stage progress via postMessage
     ─▶ Blob + object URL ─▶ preview, size delta, download / .zip
```

- **Two real progress indicators per file:** upload/read (FileReader
  `onprogress`) and transformation (worker stage messages: decode → process →
  encode). No fake timers.
- **Lazy codecs:** each WASM codec is a `import()` inside the worker, so the
  initial bundle stays small. A codec only downloads the first time its format is
  used.
- **Fallback:** if a `@jsquash` codec fails, JPEG/PNG/WebP fall back to the native
  `OffscreenCanvas.convertToBlob`.
- **Concurrency:** up to 3 files convert in parallel (one worker each). Each is
  independently **cancelable** (worker terminate) and **retryable**.
- **Format detection** never trusts the browser MIME — it reads magic bytes, with
  an SVG text sniff and filename fallback.

### Server (optional)

`POST /api/convert` (multipart: `file`, `target`, `quality`, `lossless`,
`maxEdge`) runs **sharp/libvips** and streams **Server-Sent Events**:
`progress` stages, then a final `done` (base64) or `error`. Covers
jpeg/png/webp/avif/gif/tiff and SVG rasterization. Use it for large batches or
low-power clients; the in-browser pipeline remains the default.

---

## Animation principles (Emil Kowalski)

- Only `transform` / `opacity` animate — progress meters use `scaleX`, never
  width. Everything stays on the compositor.
- Custom **ease-out** curves, UI durations ≤ ~250 ms; buttons get
  `active:scale(0.97)` press feedback.
- Selects/popovers scale from their trigger (`--radix-*-transform-origin`), not
  center.
- Drawers/toasts (Vaul, Sonner) translate by `100%` of their own size.
- `prefers-reduced-motion` drops transform motion, keeps short fades.
- Hover effects gated behind `@media (hover: hover) and (pointer: fine)` via Tailwind.

---

## Structure

```
app/            layout, page, api/convert (sharp + SSE), globals.css
components/     Dropzone, ConversionQueue, FileCard, ProgressBar,
                FormatSelector, QualitySlider, OptionsPanel, MobileSettings,
                ThemeToggle, ui/* (button, select, slider, switch)
lib/            detectFormat, formats (registry/matrix), converter (worker bridge),
                utils, types, engines/* (resvg, heic, vips, vectorize, raster)
workers/        convert.worker.ts  (decode → resize → encode, lazy codecs)
store/          useConversionStore.ts (Zustand queue: add/cancel/retry/zip)
```

---

## Notes & limits

- **JPEG XL** encodes/decodes fine but most browsers can't *display* `.jxl`
  inline yet — download works.
- **GIF/TIFF** use pure-JS libs (`gifenc` / `UTIF.js`) loaded from the CDN. GIF
  output is a single frame, 256-color quantized; TIFF is uncompressed RGBA.
- **ICO** output is capped to 256×256 (format limit) and stored as PNG-in-ICO.
- Max input size 100 MB (configurable in `store/useConversionStore.ts`).
