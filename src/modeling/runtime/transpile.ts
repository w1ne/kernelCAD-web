// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as ts from 'typescript';

export interface TranspileResult {
  code: string;
  sourceMap?: string;
}

/**
 * Transpile a `.kcad.ts` user script down to ES2022 JavaScript.
 *
 * Uses TypeScript's `transpileModule` which performs syntax-only erasure (no
 * type checking, no diagnostics by default). Strict mode is intentionally
 * relaxed — user scripts shouldn't have to satisfy our `strict` settings,
 * and the runtime is responsible for sandboxing rather than type safety.
 */
export function transpileTs(source: string, fileName: string): TranspileResult {
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
