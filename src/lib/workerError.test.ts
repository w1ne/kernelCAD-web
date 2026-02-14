import { describe, it, expect } from 'vitest';
import { classifyExecutionError } from './workerError';

function readMetadata(message: string) {
  const marker = '[KCAD_ERROR]';
  const idx = message.indexOf(marker);
  if (idx === -1) return null;
  const raw = message.slice(idx + marker.length).trim();
  return JSON.parse(raw) as { code: string; recoverable: boolean; operation?: string };
}

describe('worker error classification', () => {
  it('adds SAFE_SKETCH_VALIDATION metadata for invalid spline input', () => {
    const msg = classifyExecutionError(new Error('Invalid spline input: at least 2 points are required.'));
    const meta = readMetadata(msg);
    expect(meta).toMatchObject({
      code: 'SAFE_SKETCH_VALIDATION',
      recoverable: true,
      operation: 'spline',
    });
  });

  it('adds SAFE_SKETCH_VALIDATION metadata for invalid bezier input', () => {
    const msg = classifyExecutionError(new Error('Invalid bezier input: control points and endpoint must be finite 2D/3D points.'));
    const meta = readMetadata(msg);
    expect(meta).toMatchObject({
      code: 'SAFE_SKETCH_VALIDATION',
      recoverable: true,
      operation: 'bezier',
    });
  });

  it('adds OPENCASCADE_ERROR metadata for numeric OC error codes', () => {
    const msg = classifyExecutionError('1234');
    const meta = readMetadata(msg);
    expect(meta).toMatchObject({
      code: 'OPENCASCADE_ERROR',
      recoverable: true,
    });
    expect(msg).toContain('OpenCascade Error (Code: 1234)');
  });
});
