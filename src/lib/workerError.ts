export type WorkerErrorCode = 'SAFE_SKETCH_VALIDATION' | 'OPENCASCADE_ERROR' | 'EXECUTION_ERROR';
export type WorkerErrorMetadata = {
  code: WorkerErrorCode;
  recoverable: boolean;
  operation?: 'bezier' | 'spline';
};

export function toWorkerErrorMessage(error: unknown, metadata: WorkerErrorMetadata): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${message}\n[KCAD_ERROR]${JSON.stringify(metadata)}`;
}

export function classifyExecutionError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (/^\d+$/.test(raw)) {
    return toWorkerErrorMessage(
      new Error(`OpenCascade Error (Code: ${raw}). This often means an invalid geometric operation.`),
      { code: 'OPENCASCADE_ERROR', recoverable: true },
    );
  }

  if (lower.includes('invalid bezier input') || lower.includes('does not support bezier')) {
    return toWorkerErrorMessage(error, { code: 'SAFE_SKETCH_VALIDATION', recoverable: true, operation: 'bezier' });
  }

  if (lower.includes('invalid spline input') || lower.includes('does not support spline')) {
    return toWorkerErrorMessage(error, { code: 'SAFE_SKETCH_VALIDATION', recoverable: true, operation: 'spline' });
  }

  return toWorkerErrorMessage(error, { code: 'EXECUTION_ERROR', recoverable: false });
}
