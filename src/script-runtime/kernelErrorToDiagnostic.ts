// src/script-runtime/kernelErrorToDiagnostic.ts
//
// Converts a script-runtime exception into a `CompilerDiagnostic`. KernelError
// carries its own diagnostic code; everything else falls through to a caller-
// supplied `defaultCode` (e.g. `cli.script.exception` for evaluate, or
// `cli.export.exception` for export — preserves the existing per-command
// fallback semantics).
//
// featureId flows one direction: throw site → KernelError constructor →
// diagnostic. No caller override needed or possible.
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { isKernelError } from '../intent/kernelError';

export function kernelErrorToDiagnostic(
  e: unknown,
  defaultCode: string = 'cli.script.exception',
): CompilerDiagnostic {
  if (isKernelError(e)) {
    return {
      target: 'export-occt',
      code: e.code,
      severity: 'error',
      message: e instanceof Error ? e.message : String(e),
      ...(e.featureId !== undefined ? { featureId: e.featureId } : {}),
    };
  }
  const msg = e instanceof Error ? e.message : String(e);
  return {
    target: 'export-occt',
    code: defaultCode,
    severity: 'error',
    message: msg,
  };
}
