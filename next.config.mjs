/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // sharp is a server-only native dep; keep it external so it isn't bundled.
  serverExternalPackages: ['sharp'],

  experimental: {
    // Tree-shake the many small @jsquash entry points.
    optimizePackageImports: ['@jsquash/jpeg', '@jsquash/png', '@jsquash/webp', '@jsquash/avif', '@jsquash/jxl'],
  },

  webpack: (config) => {
    // Enable async WebAssembly so codec .wasm modules can be imported/instantiated.
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };

    // Emit any directly-imported .wasm as a static asset with a stable URL.
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: { filename: 'static/wasm/[name].[hash][ext]' },
    });

    return config;
  },

  // NOTE: We intentionally do NOT set COOP/COEP cross-origin-isolation headers.
  // The codec libs load from the esm.sh CDN. Enabling isolation would make
  // crossOriginIsolated === true, so jsquash picks its multithreaded encoder
  // (avif_enc_mt / jxl_enc_mt) — which spawns a nested Worker from the CDN URL.
  // Constructing a cross-origin Worker is forbidden by browsers, so AVIF/JXL fail.
  // Without isolation, SharedArrayBuffer is undefined -> jsquash uses the
  // single-threaded encoders (no nested worker). Slower, but works from a CDN.
  // To re-enable multithreading you must self-host the codecs same-origin.
};

export default nextConfig;
