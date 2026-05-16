import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('headless architecture boundary', () => {
  it('keeps CaptureSession free of direct OCCT/recompute orchestration', () => {
    const source = readFileSync('src/capture/captureSession.ts', 'utf8');

    expect(source).not.toContain('../modeling/compute/recomputeEngine');
    expect(source).not.toContain('../modeling/backends/occt/occtLowerer');
    expect(source).not.toContain('../kernel/backends/occt/occtBackend');
    expect(source).toContain('../modeling/buildModel');
  });
});
