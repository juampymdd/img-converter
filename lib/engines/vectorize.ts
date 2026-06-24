// Raster -> SVG (vectorization) via imagetracerjs, then minified with SVGO.
// Both loaded from CDN (see cdn.ts).
import { cdnImport, VERSIONS } from './cdn';

export async function vectorize(data: ImageData): Promise<ArrayBuffer> {
  const itMod = await cdnImport(VERSIONS.imagetracer);
  const ImageTracer = itMod.default ?? itMod;

  // imagetracer expects a plain { width, height, data } object.
  const raw = { width: data.width, height: data.height, data: data.data };
  const svg: string = ImageTracer.imagedataToSVG(raw, {
    // Finer trace: more colors + smaller omitted paths = closer to the source.
    ltres: 0.5,
    qtres: 0.5,
    pathomit: 1,
    numberofcolors: 64,
    colorquantcycles: 5,
    mincolorratio: 0,
    strokewidth: 0,
    linefilter: true,
    roundcoords: 1,
    scale: 1,
  });

  let optimized = svg;
  try {
    const { optimize } = await cdnImport(VERSIONS.svgo);
    const result = optimize(svg, { multipass: true, plugins: ['preset-default', { name: 'removeDimensions' }] });
    if (result && result.data) optimized = result.data;
  } catch {
    // SVGO is best-effort; raw imagetracer output is already valid SVG.
  }

  return new TextEncoder().encode(optimized).buffer as ArrayBuffer;
}
