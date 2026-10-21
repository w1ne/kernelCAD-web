// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// internalSpurGear builds the ring as ONE holed-profile extrude (rim circle +
// inverted involute bore as a hole). Reference values below come from the
// previous construction (cylinder minus the extruded bore) on develop.
import { beforeAll, describe, expect, it } from 'vitest';
import { measureArea, measureVolume } from 'replicad';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/composition/buildModel';

beforeAll(async () => { await initOcct(); }, 60_000);

const RING = `internalSpurGear({ module: 1, teeth: 12, faceWidth: 5, backlash: 0.1, rimThickness: 3 })`;

async function solid(code: string) {
  const model = await buildModel({ code, fileName: 'ring.kcad.ts' });
  expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  return { model, shape: (model.rootShape as OcctBackend).getReplicadShape() };
}

describe('internalSpurGear as a holed extrude', () => {
  it('matches the cylinder-minus-bore solid: volume, area, bounds; no boolean record', async () => {
    const { model, shape } = await solid(`return ${RING};`);
    expect(model.records.map(r => r.kind)).toEqual(['sketch', 'extrude']);
    expect(measureVolume(shape)).toBeCloseTo(1024.111, 2);
    const { min, max } = (model.rootShape as OcctBackend).boundingBox();
    [-10.25, -10.25, 0].forEach((v, k) => expect(min[k]).toBeCloseTo(v, 3));
    [10.25, 10.25, 5].forEach((v, k) => expect(max[k]).toBeCloseTo(v, 3));
    expect(measureArea(shape)).toBeGreaterThan(0);
    const planes = shape.faces.filter(f => f.geomType === 'PLANE');
    expect(planes.map(f => Math.round(f.center.z * 1000) / 1000).sort()).toEqual([0, 5]);
  }, 30_000);

  it("keeps 'top' / 'bottom' face selectors working", async () => {
    const top = await solid(`return ${RING}.cutout(path().moveTo(9, -1).lineTo(11, -1).lineTo(11, 1).lineTo(9, 1).close(), { face: 'top', depth: 2 });`);
    expect(measureVolume(top.shape)).toBeCloseTo(1019.152, 2);
    const { min } = (top.model.rootShape as OcctBackend).boundingBox();
    expect(min[2]).toBeCloseTo(0, 3);
    const bottom = await solid(`return ${RING}.cutout(path().moveTo(9, -1).lineTo(11, -1).lineTo(11, 1).lineTo(9, 1).close(), { face: 'bottom', depth: 2 });`);
    expect(measureVolume(bottom.shape)).toBeCloseTo(1019.152, 2);
  }, 30_000);
});
