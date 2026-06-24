// Direct .wasm imports resolve to an emitted asset URL (see next.config.mjs).
declare module '*.wasm' {
  const url: string;
  export default url;
}

// Untyped JS libraries used inside the worker.
declare module 'imagetracerjs';
declare module 'libheif-js/wasm-bundle';
