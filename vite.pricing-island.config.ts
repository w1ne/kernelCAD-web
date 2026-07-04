// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Builds the marketing-landing pricing island (site/island/pricing-island.tsx)
// into stable, hashless assets under site/public/ so site/index.html can
// reference them directly:
//   /pricing-island.js   /pricing-island.css
// The island mounts the SAME PricingSection component used by the in-app
// /pricing route — one component, both surfaces.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  // Don't copy the app's public/ assets (hdri, wasm, fonts) into the marketing
  // site — this build only emits the pricing island bundle.
  publicDir: false,
    // Emit directly into site/ root (like the committed site/style.css) so the
    // assets serve at /pricing-island.js — no public/ symlink dance, and it
    // matches how the CF Pages deploy copies site/. to the upload root.
  build: {
    outDir: 'site',
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./site/island/pricing-island.tsx', import.meta.url)),
      output: {
        entryFileNames: 'pricing-island.js',
        assetFileNames: (asset) =>
          asset.names?.some((n) => n.endsWith('.css')) ? 'pricing-island.css' : 'assets/[name][extname]',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
});
