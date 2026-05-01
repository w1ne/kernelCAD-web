// src/intent/kernelError.ts
//
// `KernelError` is the kernelCAD-thrown exception type. Carrying a structured
// `code` field lets the script-runtime exception path emit a `CompilerDiagnostic`
// with the same code that `whyDidThisFail` registers a hint for, instead of
// the generic `cli.script.exception` fallback.

export class KernelError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'KernelError';
  }
}

export function isKernelError(e: unknown): e is KernelError {
  return e instanceof KernelError || (
    typeof e === 'object' && e !== null && 'code' in e && (e as { name?: string }).name === 'KernelError'
  );
}
