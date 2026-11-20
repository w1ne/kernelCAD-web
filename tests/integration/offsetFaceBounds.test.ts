// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `thicken()` on a curved surface makes an offset-surface face. OCCT's
// default `Bnd_Box` bounds that face by its basis surface and stores the
// offset distance as the box gap. `boundingBox()` removed the whole gap as
// if it were tolerance, so the box fell inside the solid: the pocket-watch
// crystal (thicken(0.4)) read y min -8.5 mm instead of -8.899 mm.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';

async function lower(code: string): Promise<OcctBackend> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors).toEqual([]);
  return r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
}

/** OCCT's exact, tolerance-inclusive box. */
function exactBox(shape: OcctBackend): number[] {
  const oc = getOC() as any;
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.AddOptimal((shape as any).shape.wrapped, box, false, true);
    const lo = box.CornerMin();
    const hi = box.CornerMax();
    return [lo.X(), lo.Y(), lo.Z(), hi.X(), hi.Y(), hi.Z()];
  } finally {
    box.delete();
  }
}

function hasOffsetFace(shape: OcctBackend): boolean {
  const oc = getOC() as any;
  const exp = new oc.TopExp_Explorer_2((shape as any).shape.wrapped, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    for (; exp.More(); exp.Next()) {
      const s = new oc.BRepAdaptor_Surface_2(oc.TopoDS.Face_1(exp.Current()), false);
      const offset = s.GetType() === oc.GeomAbs_SurfaceType.GeomAbs_OffsetSurface;
      s.delete();
      if (offset) return true;
    }
  } finally {
    exp.delete();
  }
  return false;
}

beforeAll(async () => {
  await initOcct();
}, 120_000);

const TOL = 1e-6;

/** The box must contain the exact box. Non-offset B-spline faces keep their
 *  pole hull (up to `slack` mm per side) until they are refined. */
function expectContains(shape: OcctBackend, slack: number) {
  const { min, max } = shape.boundingBox();
  const exact = exactBox(shape);
  for (let a = 0; a < 3; a++) {
    expect(min[a]).toBeLessThanOrEqual(exact[a] + TOL);
    expect(min[a]).toBeGreaterThan(exact[a] - slack);
    expect(max[a]).toBeGreaterThanOrEqual(exact[a + 3] - TOL);
    expect(max[a]).toBeLessThan(exact[a + 3] + slack);
  }
}

// The pocket-watch crystal: a periodic NURBS dome, thickened by 0.4 mm.
const CRYSTAL = `
const R = 22 * 1.05, RISE = 3.2;
const controls = [];
for (let i = 0; i < 5; i += 1) {
  const row = [];
  for (let j = 0; j < 12; j += 1) {
    const r = i / 4;
    const a = (j / 12) * 2 * Math.PI;
    row.push([r * R * Math.cos(a), r * R * Math.sin(a), (1 - r * r) * RISE]);
  }
  controls.push(row);
}
const v = [];
for (let i = 0; i <= 12; i += 1) v.push(i);
return nurbsSurface({
  controls,
  degree: { u: 3, v: 3 },
  knots: { u: [0, 0, 0, 0, 0.5, 1, 1, 1, 1], v },
  periodic: { u: false, v: true },
}).thicken(0.4);`;

describe('boundingBox on thickened curved surfaces', () => {
  it('contains the offset side of the pocket-watch crystal', async () => {
    const crystal = await lower(CRYSTAL);
    expect(hasOffsetFace(crystal)).toBe(true);
    const exact = exactBox(crystal);
    const { min, max } = crystal.boundingBox();
    // The offset side lies 0.4 mm beyond the dome along its normal; the box
    // read z max 3.2 (the dome apex) instead of 3.6.
    expect(max[2]).toBeGreaterThanOrEqual(exact[5] - TOL);
    expect(min[2]).toBeCloseTo(exact[2], 5);
    expectContains(crystal, 1);
  });

  it('contains a thickened bump after a translation', async () => {
    const bump = await lower(`
      return nurbsSurface({
        controls: [
          [[0, 0, 0], [0, 10, 0], [0, 20, 0]],
          [[10, 0, 0], [10, 10, 8], [10, 20, 0]],
          [[20, 0, 0], [20, 10, 0], [20, 20, 0]],
        ],
        degree: { u: 2, v: 2 },
      }).thicken(1.5).translate(5, -3, 2);`);
    expect(hasOffsetFace(bump)).toBe(true);
    // The bump face's pole hull reaches z 10 (exact 5.6).
    expectContains(bump, 5);
  });

  it('keeps integral bounds on a thickened flat sheet', async () => {
    const sheet = await lower(`
      return nurbsSurface({
        controls: [
          [[0, 0, 0], [0, 10, 0]],
          [[10, 0, 0], [10, 10, 0]],
        ],
        degree: { u: 1, v: 1 },
      }).thicken(2);`);
    const { min, max } = sheet.boundingBox();
    expect(min[0]).toBeCloseTo(0, 6);
    expect(max[0]).toBeCloseTo(10, 6);
    expect(max[2] - min[2]).toBeCloseTo(2, 3);
  });
});
