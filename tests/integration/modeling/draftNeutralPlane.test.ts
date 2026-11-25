// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `draft(angleDeg, { face, neutralPlane })` documented `neutralPlane` as the
// parting plane where the drafted face keeps its original position. The
// lowerer used to ignore a named plane that differed from the drafted face:
// it derived a plane at the body extent along the pull direction and only
// emitted `feature.draft.neutral-plane-derived`. On a 40 x 30 x 20 box the
// difference is not cosmetic: drafting the front face about the named top
// plane grows the solid, while the derived bottom plane shrinks it.
//
// These tests pin the named plane, its label form, the unchanged default, and
// the honest refusals for an unknown, non-planar or non-intersecting plane.
import { beforeAll, describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

async function modelOf(code: string) {
  return buildModel({ code, fileName: 'draft-neutral-plane.kcad.ts' });
}

const BOX = 'box(40, 30, 20)';
const BOX_VOLUME = 40 * 30 * 20;
// A 10 degree taper of the y = 0 face about the top plane rotates the bottom
// edge to y = -20 tan(10 deg); the added wedge is 40 wide and 20 tall.
const TOP_PLANE_GAIN = 40 * 0.5 * 20 * (20 * Math.tan((10 * Math.PI) / 180));
// About the derived bottom plane the same rotation removes that wedge.
const BOTTOM_PLANE_LOSS = TOP_PLANE_GAIN;

describe('draft about a named neutral plane', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('drafts the front face about the named top plane and keeps the top edge fixed', async () => {
    const model = await modelOf(`return ${BOX}.draft(10, { face: 'front', neutralPlane: 'top' });`);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(model.diagnostics.some((d) => d.code === 'feature.draft.neutral-plane-derived')).toBe(false);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.volume()).toBeCloseTo(BOX_VOLUME + TOP_PLANE_GAIN, 4);
      const box = shape.boundingBox();
      // The z = 20 front edge stays at y = 0; the z = 0 edge swings outward.
      expect(box.min[1]).toBeCloseTo(-20 * Math.tan((10 * Math.PI) / 180), 4);
      expect(box.max[1]).toBeCloseTo(30, 4);
      expect(box.min[2]).toBeCloseTo(0, 4);
      expect(box.max[2]).toBeCloseTo(20, 4);
      expect(shape.solidComponents()).toHaveLength(1);
      expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('honors the named plane through a face label', async () => {
    const model = await modelOf(`
      const body = box(40, 30, 20, false, { faceLabels: { parting: 'top' } });
      return body.draft(10, { face: 'front', neutralPlane: 'parting' });
    `);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      expect(shape.volume()).toBeCloseTo(BOX_VOLUME + TOP_PLANE_GAIN, 4);
      expect(shape.boundingBox().min[1]).toBeCloseTo(-20 * Math.tan((10 * Math.PI) / 180), 4);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('keeps the derived parting plane when neutralPlane is omitted', async () => {
    const model = await modelOf(`return ${BOX}.draft(10, { face: 'front' });`);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    try {
      // Pinned legacy default: the plane is derived at the body extent
      // opposite the pull direction, so the same taper removes the wedge and
      // the top edge swings inward.
      expect(shape.volume()).toBeCloseTo(BOX_VOLUME - BOTTOM_PLANE_LOSS, 4);
      expect(shape.boundingBox().min[1]).toBeCloseTo(0, 4);
    } finally {
      shape.dispose?.();
    }
  }, 120_000);

  it('refuses an unknown neutralPlane name instead of silently deriving a plane', async () => {
    const model = await modelOf(`return ${BOX}.draft(10, { face: 'front', neutralPlane: 'parting-line' });`);
    const errors = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe('feature.invalid-args');
    expect(errors[0]!.message).toMatch(/neutralPlane/);
    expect(errors[0]!.message).toMatch(/parting-line/);
    const shape = (model.rootShape ?? [...model.shapes.values()].at(-1)) as OcctBackend | undefined;
    try {
      expect(shape).toBeDefined();
      expect(shape!.volume()).toBeCloseTo(BOX_VOLUME, 6);
    } finally {
      shape?.dispose?.();
    }
  }, 120_000);

  it('refuses a non-planar neutralPlane face', async () => {
    const model = await modelOf(`
      const body = cylinder(20, 10, undefined, { faceLabels: { wall: { ofSurfaceType: 'CYLINDER' } } });
      return body.draft(10, { face: 'top', neutralPlane: 'wall' });
    `);
    const errors = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe('feature.invalid-args');
    expect(errors[0]!.message).toMatch(/neutralPlane/);
    expect(errors[0]!.message).toMatch(/planar/i);
  }, 120_000);

  it('refuses a neutral plane parallel to the drafted face', async () => {
    const model = await modelOf(`return ${BOX}.draft(10, { face: 'front', neutralPlane: 'back' });`);
    const errors = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((d) => d.code === 'feature.draft.failed')).toBe(true);
    const shape = (model.rootShape ?? [...model.shapes.values()].at(-1)) as OcctBackend | undefined;
    try {
      expect(shape).toBeDefined();
      expect(shape!.volume()).toBeCloseTo(BOX_VOLUME, 3);
    } finally {
      shape?.dispose?.();
    }
  }, 120_000);
});
