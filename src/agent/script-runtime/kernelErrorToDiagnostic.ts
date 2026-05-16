// src/script-runtime/kernelErrorToDiagnostic.ts
//
// Converts a script-runtime exception into a `CompilerDiagnostic`. KernelError
// carries its own diagnostic code (and optional hint override); everything else
// falls through to a caller-supplied `defaultCode` (e.g. `cli.script-exception`
// for evaluate, `cli.export-exception` for export — preserves the existing
// per-command fallback semantics).
//
// `hint` is mandatory on every diagnostic. If KernelError doesn't supply one,
// we look up the catalogue template; for `defaultCode` we always use the template.
//
// featureId flows one direction: throw site → KernelError constructor →
// diagnostic. No caller override needed or possible.
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextAction } from '../../shared/diagnostics/diagnostic';
import type { DiagnosticCode } from '../../shared/diagnostics/codes';
import { HINT_TEMPLATES } from '../../shared/diagnostics/codes';
import { isKernelError } from '../../shared/intent/kernelError';

export function kernelErrorToDiagnostic(
  e: unknown,
  defaultCode: DiagnosticCode = 'cli.script-exception',
): CompilerDiagnostic {
  if (isKernelError(e)) {
    return withNextAction({
      target: 'export-occt',
      code: e.code,
      severity: 'error',
      message: e instanceof Error ? e.message : String(e),
      hint: e.hint ?? HINT_TEMPLATES[e.code].template,
      ...(e.featureId !== undefined ? { featureId: e.featureId } : {}),
    });
  }
  const msg = e instanceof Error ? e.message : String(e);
  return withNextAction({
    target: 'export-occt',
    code: defaultCode,
    severity: 'error',
    message: msg,
    hint: HINT_TEMPLATES[defaultCode].template,
  });
}
