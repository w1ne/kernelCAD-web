// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A vec3 connector origin refuses a param, and the hint named only the `at`
// path. A connector that is not at a fixed point of its part (a seat on a
// face that a param moves) has a second path in a script: Number(param) gives
// the current value, and an edit to the param runs the script again. The hint
// now names that path, and this test holds the behaviour the hint promises.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel, type BuiltModel } from '../../../src/modeling/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const script = (origin: string) => `
const len = param('len', 30);
const asm = assembly('rig');
const base = asm.part('base', box(len, 20, 10));
const cap = asm.part('cap', box(5, 20, 10), { at: [len, 0, 0] });
base.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: ${origin} } });
cap.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 10, 5] } });
asm.mate('fix', 'base.seat', 'cap.seat', 'fastened');
return asm.model();`;

function seatOrigin(model: BuiltModel): unknown {
  const asm = [...model.session.assemblies.values()][0] as Assembly;
  const seat = asm.__parts().find((p) => p.name === 'base')?.mateConnectors.find((c) => c.name === 'seat');
  return seat?.origin.kind === 'vec3' ? seat.origin.value : undefined;
}

const errors = (model: BuiltModel) => model.diagnostics.filter((d) => d.severity === 'error');

describe('vec3 connector origin from a param value', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('refuses a bare param and names both ways to follow it', async () => {
    const refused = await buildModel({ fileName: 'seat.kcad.ts', code: script('[len, 10, 5]') }).catch((e: unknown) => e);
    expect(refused).toMatchObject({
      code: 'feature.invalid-args',
      message: expect.stringContaining('origin.value — got [param len, 10, 5]; requires three finite numbers'),
    });
    const hint = (refused as { hint?: string }).hint ?? '';
    expect(hint).toContain('place it with a param in `at`');
    expect(hint).toContain('Number(x) gives the current value of the param as a plain number');
  }, 120_000);

  it('accepts Number(param) and moves the seat on a param edit', async () => {
    const m = await buildModel({ fileName: 'seat.kcad.ts', code: script('[Number(len), 10, 5]') });
    expect(errors(m), JSON.stringify(m.diagnostics)).toEqual([]);
    expect(seatOrigin(m)).toEqual([30, 10, 5]);

    const up = await updateModelParams(m, [{ name: 'len', value: 50 }]);
    expect(errors(up.model), JSON.stringify(up.model.diagnostics)).toEqual([]);
    expect(seatOrigin(up.model)).toEqual([50, 10, 5]);
  }, 120_000);
});
