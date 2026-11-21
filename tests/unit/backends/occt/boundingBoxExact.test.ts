import { describe, it, expect } from 'vitest';
import { buildModel } from '../../../../src/modeling/buildModel';

describe('boundingBox({ exact: true })', () => {
  it('default box stays outside and close to the tessellation box (filleted cylinder)', async () => {
    const model = await buildModel({
      code: 'return cylinder(30, 10).fillet(3);',
      fileName: 'bbox-exact.kcad.ts',
    });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape!;

    const padded = shape.boundingBox();
    const exact = shape.boundingBox({ exact: true });

    // OCCT's default Bnd_Box pads the trimmed fillet torus (~10.82 for
    // r=10); its exact face box keeps the default box at the true radius.
    expect(padded.max[0]).toBeGreaterThanOrEqual(10);
    expect(padded.max[0]).toBeLessThan(10 + 1e-5);
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

  it('default box does not shrink to the mesh after the shape is meshed', async () => {
    // replicad's box reads the triangulation once one exists: after the
    // exact (meshed) box, the default box of a radius-10 cylinder read
    // x from -9.9756 and y to 9.9939 instead of +-10.
    const code = 'return cylinder(5, 10);';
    const fresh = (await buildModel({ code, fileName: 'bbox-fresh.kcad.ts' })).rootShape!;
    const meshed = (await buildModel({ code, fileName: 'bbox-meshed.kcad.ts' })).rootShape!;
    meshed.boundingBox({ exact: true });
    const before = fresh.boundingBox();
    const after = meshed.boundingBox();
    for (let a = 0; a < 2; a++) {
      expect(before.min[a]).toBeCloseTo(-10, 6);
      expect(before.max[a]).toBeCloseTo(10, 6);
      expect(after.min[a]).toBeCloseTo(-10, 6);
      expect(after.max[a]).toBeCloseTo(10, 6);
    }
    expect(after.min[2]).toBeCloseTo(0, 6);
    expect(after.max[2]).toBeCloseTo(5, 6);
  });
});
