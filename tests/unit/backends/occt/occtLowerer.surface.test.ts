import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';

describe('OcctLowerer: surfaceThicken + surfaceToShape', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers nurbsSurface(...).thicken(2) to a non-empty solid with z span ≈ 2', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const surf = api.nurbsSurface({
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    const shape = surf.thicken(2);
    const backend = await shape.lower();
    expect(backend.volume()).toBeGreaterThan(0);
    const bb = backend.boundingBox();
    expect(Math.abs((bb.max[2] - bb.min[2]) - 2)).toBeLessThan(0.1);
  });

  it('lowers nurbsSurface(...).toShape() to a zero-volume shell with bbox spanning the panel', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const surf = api.nurbsSurface({
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    const shape = surf.toShape();
    const backend = await shape.lower();
    expect(Math.abs(backend.volume())).toBeLessThan(1e-3);
    const bb = backend.boundingBox();
    expect(bb.max[0] - bb.min[0]).toBeGreaterThan(9);
    expect(bb.max[1] - bb.min[1]).toBeGreaterThan(9);
  });

  it('lowers a wavy 3x3 surface and thickens it to a non-empty solid', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const surf = api.nurbsSurface({
      controls: [
        [[0, 0, 0], [0, 5, 1], [0, 10, 0]],
        [[5, 0, 1], [5, 5, 2], [5, 10, 1]],
        [[10, 0, 0], [10, 5, 1], [10, 10, 0]],
      ],
      degree: { u: 2, v: 2 },
    });
    const shape = surf.thicken(1);
    const backend = await shape.lower();
    expect(backend.volume()).toBeGreaterThan(0);
  });
});
