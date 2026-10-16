// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// spurGear() (an extruded sketch with a bore subtracted) carries no canonical
// face names. `{ face: 'top' }` on it used to say "Face 'top' was removed by
// an upstream operation" — false: the gear never had a named top, and its top
// face plainly exists. A shape with no canonical lineage now resolves the name
// by the box rule (the one planar face facing that way at the body's extreme),
// and when there is no such face it says the shape has no canonical face.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

const KEY = 'const key = path().moveTo(-1, 0).lineTo(1, 0).lineTo(1, 3.5).lineTo(-1, 3.5).close();';

async function build(code: string) {
  return buildModel({ fileName: 'gear-faces.kcad.ts', code });
}

describe('canonical face names on generated shapes', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it("spurGear with a bore: cutout on { face: 'top' } cuts the keyway", async () => {
    const plain = await build('return spurGear({ module: 1, teeth: 24, faceWidth: 6, bore: 5 });');
    const m = await build(`${KEY}
let g = spurGear({ module: 1, teeth: 24, faceWidth: 6, bore: 5 });
return g.cutout(key, { face: 'top', depth: 6 });`);
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    const removed = plain.tailShape!.volume() - m.tailShape!.volume();
    // The 2 x 3.5 key slot overlaps the Ø5 bore, so only the part beyond
    // r = 2.5 (≈ 2.14 mm² of the 7 mm² slot) is new material: ≈ 12.8 mm³.
    expect(removed).toBeGreaterThan(12);
    expect(removed).toBeLessThan(14);
  }, 120_000);

  it("spurGear without a bore resolves 'top' and 'bottom' (no lineage at all)", async () => {
    const m = await build(`return spurGear({ module: 1, teeth: 24, faceWidth: 6 })
  .hole({ face: 'top' }, { u: 0, v: 0, diameter: 3, depth: 2 })
  .hole({ face: 'bottom' }, { u: 0, v: 0, diameter: 3, depth: 2 });`);
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
  }, 120_000);

  it('an extruded sketch prism resolves its top cap', async () => {
    const m = await build(`${KEY}
return path().moveTo(-10, -10).lineTo(10, -10).lineTo(10, 10).lineTo(-10, 10).close().extrude(6)
  .cutout(key, { face: 'top', depth: 6 });`);
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    expect(m.tailShape!.volume()).toBeCloseTo(20 * 20 * 6 - 2 * 3.5 * 6, 1);
  }, 120_000);

  it('a name the gear cannot have is reported as absent, never as "removed upstream"', async () => {
    const m = await build(`return spurGear({ module: 1, teeth: 24, faceWidth: 6, bore: 5 })
  .hole({ face: 'left' }, { u: 0, v: 0, diameter: 3, depth: 2 });`);
    const err = m.diagnostics.find((d) => d.severity === 'error');
    expect(err?.code).toBe('feature.face-ref.not-applicable');
    expect(err?.message).toMatch(/has no canonical face 'left'/);
    expect(err?.message).not.toMatch(/removed by an upstream/);
    expect(err?.hint).toMatch(/byNormal/);
  }, 120_000);

  it("a box whose named top really was cut away still reports face-ref.removed", async () => {
    const m = await build(`return box(20, 20, 10).subtract(box(30, 30, 5).translate(-5, -5, 7))
  .hole({ face: 'top' }, { u: 0, v: 0, diameter: 3, depth: 2 });`);
    expect(m.diagnostics.find((d) => d.severity === 'error')?.code).toBe('feature.face-ref.removed');
  }, 120_000);
});
