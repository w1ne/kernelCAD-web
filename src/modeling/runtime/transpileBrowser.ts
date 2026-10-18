// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Browser-safe counterpart of `transpileTs` (transpile.ts).
//
// `transpileTs` reaches the `typescript` package through `lazyTypescript.ts`,
// which uses `node:module`'s `createRequire` — unavailable in a browser (the
// module load crashes with "node:module has been externalized"). A DYNAMIC
// `import('typescript')` is no good either: the compiler is CommonJS, and
// Vite's dev worker environment resolves that dynamic import to an empty
// module (observed: `{}` with no `default`). A STATIC import is what the
// bundler and the dev server handle correctly at any environment, at the cost
// of putting the compiler (~3.4 MB raw / ~1 MB gzipped) in the worker chunk —
// which is lazy (a worker only exists for a browser kernel session) and the
// Studio's sources are TypeScript anyway.
import * as ts from 'typescript';
import type { TranspileResult } from './transpile';

/** Transpile a `.kcad.ts` script to ES2022 JavaScript, browser-side. */
export function transpileTsBrowser(source: string, fileName: string): TranspileResult {
  const result = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      sourceMap: true,
      strict: false,
      esModuleInterop: true,
      isolatedModules: true,
    },
    reportDiagnostics: false,
  });
  return {
    code: result.outputText,
    sourceMap: result.sourceMapText,
  };
}
