// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A numeric param() could not be used inside a selector query: `{ atZ: h }`
// or `within: { yMin: pw.divide(2) }` failed with "requires a finite number"
// showing the ParamRef with `value: undefined`. Query numbers now accept
// ParamRefs: captured as Params, pre-resolved at lowering, and re-resolved
// on a set_param edit.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';

// Fillet only the pocket rim; the selection box follows the pocket width.
const POCKET = `
const pw = param('pocketWidth', 20);
const PL = 80, PW = 50, PT = 10, pl = 30, pd = 5;
const plate = box(PL, PW, PT);
const pocket = box(pl, pw, pd + 1).translate((PL - pl) / 2, pw.negate().add(PW).divide(2), PT - pd);
let part = plate.subtract(pocket);
part = part.fillet(1, {
  atZ: PT,
  within: { xMin: (PL - pl) / 2 - 0.5, xMax: (PL + pl) / 2 + 0.5, yMin: pw.negate().add(PW).divide(2).subtract(0.5), yMax: pw.add(PW).divide(2).add(0.5), zMin: PT - 0.5, zMax: PT + 0.5 },
});
return part;
`;

/** Plate minus pocket minus the rim fillet: 4 straight rim edges of r = 1. */
function expectedVolume(pw: number): number {
  return 80 * 50 * 10 - 30 * pw * 5 - (1 - Math.PI / 4) * 2 * (30 + pw);
}

describe('param() inside EdgeQuery / FaceQuery numbers', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('a param-driven within box selects the pocket rim, and follows a set_param edit', async () => {
    const m = await buildModel({ fileName: 'pocket.kcad.ts', code: POCKET });
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    expect(m.rootShape!.volume()).toBeCloseTo(expectedVolume(20), 0);

    const up = await updateModelParams(m, [{ name: 'pocketWidth', value: 30 }]);
    expect(up.model.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(up.model.diagnostics)).toEqual([]);
    expect(up.result.shape.volume()).toBeCloseTo(expectedVolume(30), 0);
  }, 120_000);

  it('{ atZ: h } on a face query (holes entry face) tracks the param', async () => {
    const code = `
const h = param('h', 8);
const body = box(40, 40, h);
return body.holes({ byNormal: 'Z', atZ: h }, { positions: [{ u: 0, v: 0 }], diameter: 6, depth: 'through' });`;
    const m = await buildModel({ fileName: 'h.kcad.ts', code });
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    expect(m.rootShape!.volume()).toBeCloseTo(40 * 40 * 8 - Math.PI * 9 * 8, 0);
    const up = await updateModelParams(m, [{ name: 'h', value: 12 }]);
    expect(up.model.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(up.model.diagnostics)).toEqual([]);
    expect(up.result.shape.volume()).toBeCloseTo(40 * 40 * 12 - Math.PI * 9 * 12, 0);
  }, 120_000);
});
