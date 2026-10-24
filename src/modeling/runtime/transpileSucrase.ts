// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/transpileSucrase.ts
//
// TypeScript type stripping for the Studio's browser kernel worker.
//
// The node runner uses the TypeScript compiler (`transpileTs`, 3.40 MB raw /
// 0.97 MB gzipped, and it reaches `node:module`). The browser default
// (`transpileBrowser`) refuses TypeScript. Gallery and agent models are
// `.kcad.ts`, so the worker needs real type erasure — sucrase does exactly
// that and nothing else: ~0.2 MB minified in the worker chunk, a few ms per
// model, and no wasm (esbuild-wasm would add a ~10 MB binary to a worker that
// already loads OCCT's 11 MB). Sucrase keeps every line where it was, so
// feature script locations need no source map.
import { transform } from 'sucrase';
import type { TranspileOutput } from './runScriptCore';

/** Strip TypeScript syntax; module-isms were already normalized away. */
export function transpileSucrase(source: string, fileName: string): TranspileOutput {
  const result = transform(source, {
    transforms: ['typescript'],
    // Modern syntax runs as-is in every browser the Studio supports.
    disableESTransforms: true,
    // Imports were refused or stripped before transpile; keep what is left
    // untouched rather than eliding it on type-only guesses.
    keepUnusedImports: true,
    filePath: fileName,
  });
  return { code: result.code };
}
