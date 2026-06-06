import { describe, it, expect } from 'vitest';
import { buildModel } from '../../../../src/modeling/buildModel';

describe('boundingBox({ exact: true })', () => {
  it('tessellation box is tight where Bnd_Box pads (filleted cylinder)', async () => {
    const model = await buildModel({
      code: 'return cylinder(30, 10).fillet(3);',
      fileName: 'bbox-exact.kcad.ts',
    });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape!;

    const padded = shape.boundingBox();
    const exact = shape.boundingBox({ exact: true });

    // Default Bnd_Box pads the post-fillet B-spline face (~10.82 for r=10).
    expect(padded.max[0]).toBeGreaterThan(10.5);
    // Exact box is tight to the true radius within mesh deflection.
    expect(exact.max[0]).toBeLessThanOrEqual(10 + 1e-6);
    expect(exact.max[0]).toBeGreaterThan(9.9);
    expect(exact.min[2]).toBeCloseTo(0, 3);
    expect(exact.max[2]).toBeCloseTo(30, 3);
    // Exact ⊆ default on every axis.
    for (let a = 0; a < 3; a++) {
      expect(exact.min[a]).toBeGreaterThanOrEqual(padded.min[a] - 1e-6);
      expect(exact.max[a]).toBeLessThanOrEqual(padded.max[a] + 1e-6);
    }
  });

  it('default and exact agree on planar shapes', async () => {
    const model = await buildModel({ code: 'return box(10, 20, 30);', fileName: 'bbox-box.kcad.ts' });
    const shape = model.rootShape!;
    const padded = shape.boundingBox();
    const exact = shape.boundingBox({ exact: true });
    for (let a = 0; a < 3; a++) {
      expect(exact.min[a]).toBeCloseTo(padded.min[a], 4);
      expect(exact.max[a]).toBeCloseTo(padded.max[a], 4);
    }
  });
});
