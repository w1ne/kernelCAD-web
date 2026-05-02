// src/script-runtime/kernelErrorToDiagnostic.ts
//
// Converts a script-runtime exception into a `CompilerDiagnostic`. KernelError
// carries its own diagnostic code; everything else falls through to a caller-
// supplied `defaultCode` (e.g. `cli.script.exception` for evaluate, or
// `cli.export.exception` for export — preserves the existing per-command
// fallback semantics).
//
// The optional `featureId` parameter lets call sites with feature context
// attach the originating feature to the returned diagnostic. When omitted,
// the function checks whether the thrown `KernelError` already carries a
// `featureId` (set at the throw site). Callers without any feature context
// produce a diagnostic with `featureId: undefined` — no behavior change.
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { isKernelError } from '../intent/kernelError';

export function kernelErrorToDiagnostic(
  e: unknown,
  defaultCode: string = 'cli.script.exception',
  featureId?: string,
): CompilerDiagnostic {
  if (isKernelError(e)) {
    // Prefer explicitly-supplied featureId; fall back to what the throw site
    // embedded on the error itself (e.g. Sketch.reflect sets this.id).
    const resolvedFeatureId = featureId ?? e.featureId;
    return {
      target: 'export-occt',
      code: e.code,
      severity: 'error',
      message: e instanceof Error ? e.message : String(e),
      ...(resolvedFeatureId !== undefined ? { featureId: resolvedFeatureId } : {}),
    };
  }
  const msg = e instanceof Error ? e.message : String(e);
  return {
    target: 'export-occt',
    code: defaultCode,
    severity: 'error',
    message: msg,
    ...(featureId !== undefined ? { featureId } : {}),
  };
}
