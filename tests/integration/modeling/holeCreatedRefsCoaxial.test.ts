// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A shaft coupler (cylinder body, axial bores, radial M3 set screws): the
// body's outer cylinder came out labelled `setScrew5.wall-back`. The OD is a
// new, unlabelled face after the cut, and one of its edges is the set-screw
// rim, so the edge-radius probe matched the set screw's radius. A cylinder
// is a bore wall only when it is COAXIAL with that bore.

import { describe, it, expect, beforeAll } from 'vitest';
import type { Face } from 'replicad';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

const COUPLER = `
const L = 30;
let c = cylinder(L, 10);
c = c.hole('bottom', { u: 0, v: 0, diameter: 5, depth: 15.5, name: 'bore5' });
c = c.hole('top', { u: 0, v: 0, diameter: 8, depth: 15, name: 'bore8' });
c = c.hole({ ofSurfaceType: 'CYLINDER' }, { at: { angleDeg: 0, z: 7.5 }, diameter: 3, depth: 'through', thread: { pitch: 0.5 }, name: 'setScrew5' });
c = c.hole({ ofSurfaceType: 'CYLINDER' }, { at: { angleDeg: 0, z: 22.5 }, diameter: 3, depth: 'through', thread: { pitch: 0.5 }, name: 'setScrew8' });
return c;
`;

function labels(shape: OcctBackend): Array<{ face: Face; label: string | undefined }> {
  return shape.getReplicadShape().faces.map((face) => {
    const h = (face as unknown as { wrapped: { HashCode(n: number): number } }).wrapped.HashCode(2147483647).toString(16);
    const lin = shape.historyMap?.get(h);
    return { face, label: lin?.labelName && lin.featureName ? `${lin.featureName}.${lin.labelName}` : undefined };
  });
}

describe('hole created refs on a cylindrical body', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('the outer cylinder is not named as a set-screw wall; the real bore walls are', async () => {
    const m = await buildModel({ fileName: 'coupler.kcad.ts', code: COUPLER });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const all = labels(m.rootShape as OcctBackend);
    const cylinders = all.filter(({ face }) => face.geomType === 'CYLINDRE');
    // The OD: the cylinder whose surface is 10 mm from the Z axis.
    const od = cylinders.find(({ face }) => {
      const p = face.edges[0].startPoint;
      return Math.abs(Math.hypot(p.x, p.y) - 10) < 0.05 && face.edges.length > 3;
    });
    expect(od, 'outer cylinder face').toBeDefined();
    expect(od!.label).toBeUndefined();
    const named = all.map((x) => x.label).filter(Boolean);
    expect(named).toEqual(expect.arrayContaining(['bore5.wall', 'bore8.wall', 'setScrew5.wall', 'setScrew8.wall']));
    expect(named.some((l) => /setScrew\d\.wall-back/.test(l!))).toBe(false);
  }, 120_000);
});
