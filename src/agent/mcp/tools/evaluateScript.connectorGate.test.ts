// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Publish gate = review gate: review_cad reports a mate connector far from
// its part's material as an error (assembly.mechanical.connector-not-in-solid),
// so evaluate_script must not return ok:true for the same model. DRAW 01 v8
// rev 9 passed evaluate_script/open_in_studio with 47 such errors.

import { describe, expect, it } from 'vitest';
import { evaluateScriptTool } from './evaluateScript';

function script(connectorAt: [number, number, number]): string {
  return `
const arm = assembly('gate');
const base = arm.part('base', box(40, 40, 4));
const lid = arm.part('lid', box(40, 40, 4).translate(0, 0, 4));
const d = { type: 'frame', origin: { kind: 'vec3', value: [${connectorAt.join(',')}] }, normal: [0, 0, 1] };
base.connector('lid', d);
lid.connector('seat', d);
arm.mate('lid-fixed', 'base.lid', 'lid.seat', 'fastened');
return arm.model();
`;
}

const CODE = 'assembly.mechanical.connector-not-in-solid';

describe('evaluate_script connector-in-solid gate', () => {
  it('fails a fastened mate whose connector is 60 mm from both parts, as review_cad does', async () => {
    const r = await evaluateScriptTool({ code: script([20, 20, 64]), autosave: false });
    expect(r.ok).toBe(false);
    const errs = r.diagnostics.filter((d) => d.code === CODE);
    expect(errs.length).toBe(2);
    expect(errs.every((d) => d.severity === 'error')).toBe(true);
  }, 120_000);

  it('NEGATIVE CONTROL: the same assembly with the connector on the shared face passes', async () => {
    const r = await evaluateScriptTool({ code: script([20, 20, 4]), autosave: false });
    expect(r.diagnostics.filter((d) => d.code === CODE)).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120_000);
});
