// src/script-runtime/kernelErrorToDiagnostic.ts
//
// Converts a script-runtime exception into a `CompilerDiagnostic`. KernelError
// carries its own diagnostic code; everything else gets `cli.script.exception`.
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { isKernelError } from '../intent/kernelError';

export function kernelErrorToDiagnostic(e: unknown): CompilerDiagnostic {
  if (isKernelError(e)) {
    return {
      target: 'export-occt',
      code: (e as { code: string }).code,
      severity: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
  const msg = e instanceof Error ? e.message : String(e);
  return {
    target: 'export-occt',
    code: 'cli.script.exception',
    severity: 'error',
    message: msg,
  };
}
