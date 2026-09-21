// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/diagnostics/kernelErrorToDiagnostic.ts
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
//
// Lives in shared (not agent) so the composition layer can build the
// sweep-tolerance script evaluator without importing agent code.
import type { CompilerDiagnostic } from './diagnostic';
import { withNextAction } from './diagnostic';
import type { DiagnosticCode } from './registry';
import { HINT_TEMPLATES } from './registry';
import { isKernelError } from '../intent/kernelError';

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
