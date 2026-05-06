import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('headless architecture boundary', () => {
  it('keeps CaptureSession free of direct OCCT/recompute orchestration', () => {
    const source = readFileSync('src/capture/captureSession.ts', 'utf8');

    expect(source).not.toContain('../compute/recomputeEngine');
    expect(source).not.toContain('../backends/occt/occtLowerer');
    expect(source).not.toContain('../backends/occt/occtBackend');
    expect(source).toContain('../kernel/buildModel');
  });
});
