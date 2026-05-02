// src/intent/kernelError.ts
//
// `KernelError` is the kernelCAD-thrown exception type. Carrying a structured
// `code` field lets the script-runtime exception path emit a `CompilerDiagnostic`
// with the same code that `whyDidThisFail` registers a hint for, instead of
// the generic `cli.script.exception` fallback.

export class KernelError extends Error {
  readonly code: string;
  readonly featureId?: string;

  constructor(code: string, message: string, featureId?: string) {
    super(message);
    this.code = code;
    this.featureId = featureId;
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
