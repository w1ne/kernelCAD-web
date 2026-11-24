// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// offsetFaces() documented only planar faces and refused a cylindrical one.
// Changing a bore or boss diameter is a common mechanical edit, so the same
// call now offsets a full cylindrical face by changing its radius. These
// tests pin the measured volume, the resulting radius, the solid validity,
// the signed direction, ParamRef resolution and the refusal of a collapse.
import { beforeAll, describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

/** Radius of every full cylindrical face, measured from its area centre (on the
 *  axis for a full cylinder) to a surface point at the same height. */
function cylinderRadii(shape: OcctBackend): number[] {
  return shape
    .getReplicadShape()
    .faces.filter((face) => face.geomType === 'CYLINDRE')
    .map((face) => {
      // pointOnSurface takes normalized [0, 1] parameters; the area centre of
      // a full cylinder lies on its axis at the same height.
      const point = face.pointOnSurface(0.5, 0.5);
      const centre = face.center;
      return Math.hypot(point.x - centre.x, point.y - centre.y, point.z - centre.z);
    });
}

async function modelOf(code: string) {
  return buildModel({ code, fileName: 'cylindrical-face-offset.kcad.ts' });
}

const PLATE_WITH_BORE = `
  let body = box(40, 40, 10);
  body = body.subtract(cylinder(10, 5).translate(20, 20, 0));
`;

describe('offsetFaces on a full cylindrical face', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('narrows a 10 mm through bore to 8 mm and adds the exact ring volume', async () => {
    const model = await modelOf(`${PLATE_WITH_BORE}  return body.offsetFaces({ ofSurfaceType: 'CYLINDER' }, 1);`);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      // Positive distance grows the solid along the outward normal; the bore
      // wall normal points into the hole, so the radius falls from 5 to 4 mm.
      expect(shape.volume()).toBeCloseTo(16000 - Math.PI * 16 * 10, 6);
      expect(shape.volume()).toBeGreaterThan(16000 - Math.PI * 25 * 10);
      expect(cylinderRadii(shape).some((r) => Math.abs(r - 4) < 1e-4)).toBe(true);
      expect(cylinderRadii(shape).some((r) => Math.abs(r - 5) < 1e-4)).toBe(false);
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
      const box = shape.boundingBox();
      expect(box.min).toEqual([0, 0, 0]);
      expect(box.max).toEqual([40, 40, 10]);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('enlarges the same bore to 12 mm when the distance is negative', async () => {
    const model = await modelOf(`${PLATE_WITH_BORE}  return body.offsetFaces({ ofSurfaceType: 'CYLINDER' }, -1);`);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.volume()).toBeCloseTo(16000 - Math.PI * 36 * 10, 6);
      expect(shape.volume()).toBeLessThan(16000 - Math.PI * 25 * 10);
      expect(cylinderRadii(shape).some((r) => Math.abs(r - 6) < 1e-4)).toBe(true);
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('grows a boss from 10 mm to 11 mm radius', async () => {
    const model = await modelOf(`return cylinder(20, 10).offsetFaces({ ofSurfaceType: 'CYLINDER' }, 1);`);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      // Positive distance grows the solid; the boss wall normal points away
      // from the axis, so the radius rises from 10 to 11 mm.
      expect(shape.volume()).toBeCloseTo(Math.PI * 11 * 11 * 20, 6);
      expect(cylinderRadii(shape).some((r) => Math.abs(r - 11) < 1e-4)).toBe(true);
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
      const box = shape.boundingBox();
      expect(box.min[0]).toBeCloseTo(-11, 6);
      expect(box.max[0]).toBeCloseTo(11, 6);
      expect(box.min[2]).toBeCloseTo(0, 6);
      expect(box.max[2]).toBeCloseTo(20, 6);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('keeps a blind bore floor at its original height and only changes the wall', async () => {
    const model = await modelOf(`
      let body = box(40, 40, 10);
      body = body.subtract(cylinder(4, 5).translate(20, 20, 6));
      return body.offsetFaces({ ofSurfaceType: 'CYLINDER' }, 1);
    `);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      // The 4 mm deep blind bore narrows from radius 5 to 4 over its own
      // height only, so the plate's z bounds do not move.
      expect(shape.volume()).toBeCloseTo(16000 - Math.PI * 16 * 4, 6);
      expect(cylinderRadii(shape).some((r) => Math.abs(r - 4) < 1e-4)).toBe(true);
      const box = shape.boundingBox();
      expect(box.min[2]).toBeCloseTo(0, 6);
      expect(box.max[2]).toBeCloseTo(10, 6);
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('resolves a ParamRef distance at lower time', async () => {
    const model = await modelOf(`
      const grow = param('boreGrow', 2, { min: -4, max: 4 });
      let body = box(40, 40, 10);
      body = body.subtract(cylinder(10, 5).translate(20, 20, 0));
      return body.offsetFaces({ ofSurfaceType: 'CYLINDER' }, grow);
    `);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.volume()).toBeCloseTo(16000 - Math.PI * 9 * 10, 6);
      expect(cylinderRadii(shape).some((r) => Math.abs(r - 3) < 1e-4)).toBe(true);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('refuses a partial cylindrical face because a radial sleeve would reach outside it', async () => {
    const model = await modelOf(`
      let body = cylinder(10, 5);
      body = body.intersect(box(5, 20, 20).translate(-5, -10, -5));
      return body.offsetFaces({ ofSurfaceType: 'CYLINDER', near: [-5, 0, 5] }, 1);
    `);
    const errors = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe('feature.face-edit.rejected');
    expect(errors[0]!.message).toMatch(/FACE_EDIT_INCONSISTENT/);
    expect(errors[0]!.message).toMatch(/partial cylinder/i);
  }, 120_000);

  it('refuses a distance that would collapse the bore instead of returning a wrong body', async () => {
    const model = await modelOf(`${PLATE_WITH_BORE}  return body.offsetFaces({ ofSurfaceType: 'CYLINDER' }, 5);`);
    const errors = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe('feature.face-edit.rejected');
    expect(errors[0]!.message).toMatch(/FACE_EDIT_INCONSISTENT/);
    expect(errors[0]!.message).toMatch(/collapse/i);
    // The failed edit returns the unchanged body, not a phantom solid.
    const shape = (model.rootShape ?? [...model.shapes.values()].at(-1)) as OcctBackend | undefined;
    try {
      expect(shape).toBeDefined();
      expect(shape!.volume()).toBeCloseTo(16000 - Math.PI * 25 * 10, 6);
      expect(shape!.solidComponents()).toHaveLength(1);
    } finally {
      shape?.dispose?.();
    }
  }, 120_000);
});
