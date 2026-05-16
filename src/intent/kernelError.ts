// src/intent/kernelError.ts
//
// `KernelError` is the kernelCAD-thrown exception type. Carrying a structured
// `code` field lets the script-runtime exception path emit a `CompilerDiagnostic`
// with the same code that the catalogue registers a hint for, instead of
// the generic `cli.script-exception` fallback.

import type { DiagnosticCode } from '../shared/diagnostics/codes';

export class KernelError extends Error {
  readonly code: DiagnosticCode;
  readonly featureId?: string;
  /** Optional hint override; if absent, conversion falls back to HINT_TEMPLATES[code]. */
  readonly hint?: string;

  constructor(code: DiagnosticCode, message: string, featureId?: string, hint?: string) {
    super(message);
    this.code = code;
    this.featureId = featureId;
    this.hint = hint;
    this.name = 'KernelError';
  }
}

export function isKernelError(e: unknown): e is KernelError {
  // The structural-shape fallback was removed in rc.9 — KernelError is not
  // injected into the vm sandbox API surface, so cross-realm throws of
  // KernelError-shaped objects don't occur in current code paths. Reintroduce
  // the fallback when KernelError becomes a sandbox-visible class.
  return e instanceof KernelError;
}
