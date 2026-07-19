// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Builds the live-docs island (site/island/docs-island.ts) and the worker it
// spawns into stable, hashless assets under site/:
//   /docs-island.js        main-thread host: editor, three.js viewer, deadline
//   /docs-worker.js        OCCT + script runtime + mesher
//   /replicad_single.wasm  the 10.8 MB kernel, emitted by the ?url import
//
// Same shape as vite.pricing-island.config.ts, with two deliberate departures:
//
//   format: 'es' rather than 'iife', because the docs page reaches the island
//   through `import('/docs-island.js')` on first interaction. An iife loaded by
//   a <script src> would put three.js on the page-load path, which is the one
//   thing this page is designed not to do.
//
//   worker.format: 'es' with a pinned entryFileNames, so the worker is a single
//   predictable file. Vite would otherwise hash it into assets/, and the wasm
//   with it.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Node builtins are reachable in this graph, but only down guarded dynamic
 * imports: `lib.fromSTEP`, the parts catalog, the user cache and the TTF font
 * loader all call `requireHostFs()` first, which throws `cli.host-fs-unavailable`
 * in a browser BEFORE the `await import(...)` runs. browserGraphNodeFree.test.ts
 * asserts the STATIC graph is clean, which is the property that matters.
 *
 * Rollup still has to emit those chunks, though, and Vite's default stub
 * (`__vite-browser-external`) exports nothing, so `import { isAbsolute } from
 * 'node:path'` fails the build with "not exported". Marking them external
 * leaves a bare `node:` specifier in a chunk no browser ever loads. If one ever
 * did load, it would fail loudly on an unresolvable specifier — which is the
 * correct outcome, and better than a stub that resolves to something plausible.
 */
const NODE_BUILTIN = /^node:/;

export default defineConfig({
  root,
  base: '/',
  // Don't copy the app's public/ assets (hdri, fonts, and a second copy of the
  // wasm) into the marketing site — this build emits only the docs bundles.
  publicDir: false,
  resolve: {
    alias: {
      // Same vendored ES build the app and studio configs alias; the bare
      // specifier does not resolve on its own.
      'verb-nurbs': fileURLToPath(new URL('./vendor/verb-nurbs/build/verb.es.js', import.meta.url)),
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: NODE_BUILTIN,
      output: {
        entryFileNames: 'docs-worker.js',
        chunkFileNames: 'docs-worker-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  build: {
    outDir: 'site',
    emptyOutDir: false,
    cssCodeSplit: false,
    // The wasm is ~10.8 MB and three.js is a few hundred KB. Both are expected
    // and both are off the page-load path, so the default 500 KB warning is
    // just noise here.
    chunkSizeWarningLimit: 12_000,
    rollupOptions: {
      input: fileURLToPath(new URL('./site/island/docs-island.ts', import.meta.url)),
      external: NODE_BUILTIN,
      // The page reaches this bundle through `import('/docs-island.js').mount()`,
      // which rollup cannot see. Without this it treats the entry as an app
      // root with no live exports and tree-shakes `mount` — and everything
      // behind it, three.js included — leaving a 160-byte file and a GREEN
      // build. site/scripts/verify-docs-bundle.ts asserts the artifact is real for that reason.
      preserveEntrySignatures: 'exports-only',
      output: {
        format: 'es',
        entryFileNames: 'docs-island.js',
        chunkFileNames: 'docs-island-[hash].js',
        // Keeps the wasm at /replicad_single.wasm, which is what the worker's
        // locateFile resolves to.
        assetFileNames: '[name][extname]',
      },
    },
  },
});
