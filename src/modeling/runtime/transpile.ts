// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as nodeModule from 'node:module';
import { lazyTs as ts } from '../../shared/runtime/lazyTypescript';

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
  // Fast path: erase the type annotations in place. Positions are unchanged,
  // so no source map is needed, and the `typescript` package (~64 MB of heap,
  // ~0.6 s for a large script) is never loaded.
  const stripped = stripTypes(source);
  if (stripped !== undefined) return { code: stripped };
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

type StripTypes = (code: string, options: { mode: 'strip' }) => string;

/** Node's built-in type stripper (22.13+), when this runtime has one. */
const nodeStrip = (nodeModule as unknown as { stripTypeScriptTypes?: StripTypes }).stripTypeScriptTypes;

// The body is wrapped in a function so top-level `return` / `await` parse;
// strip mode only overwrites types with whitespace, so slicing the wrapper
// back off gives text at exactly the original offsets.
const WRAP_HEAD = 'async function __kcad_script__() {\n';
const WRAP_TAIL = '\n}';

/**
 * `source` with its TypeScript types erased in place, or undefined when the
 * runtime has no stripper or the script uses syntax that needs a real
 * transform (enum, namespace, parameter properties); the caller then falls
 * back to `ts.transpileModule`.
 */
function stripTypes(source: string): string | undefined {
  if (nodeStrip === undefined) return undefined;
  const wrapped = WRAP_HEAD + source + WRAP_TAIL;
  try {
    const out = withoutStripWarning(() => nodeStrip(wrapped, { mode: 'strip' }));
    if (out.length !== wrapped.length) return undefined;
    return out.slice(WRAP_HEAD.length, WRAP_HEAD.length + source.length);
  } catch {
    return undefined;
  }
}

/** Node flags `stripTypeScriptTypes` as experimental on first use; that
 *  notice is noise in CLI and tool output, so drop just that one. */
function withoutStripWarning<T>(run: () => T): T {
  const original = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const text = typeof warning === 'string' ? warning : warning.message;
    if (text.includes('stripTypeScriptTypes')) return;
    (original as (...args: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try {
    return run();
  } finally {
    process.emitWarning = original;
  }
}
