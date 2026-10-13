// Negative fixture for the rest-pose contact gate on the SO-100 vendor
// meshes. Own file: after the full arm, one process has no kernel heap left
// for a second STL import (see so100ArmRestContact.test.ts).

import { describe, expect, it } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('SO-100 vendor base and pan servo', () => {
  it('fails the base with its pan servo sunk 3 mm into the floor, naming the pair', async () => {
    // The vendor meshes seated as shipped share a sub-0.3 mm contact skin,
    // which the gate passes. Drop the servo 3 mm into the base floor and it
    // must fail, and `ignore` must not hide it.
    const dir = `${process.cwd()}/examples/robot-arm/so100/parts/sim`;
    const code = `
      const arm = assembly('pair');
      const a = arm.part('base', (await lib.fromSTL('${dir}/Base.stl', { allowOpen: true })).scale(1000));
      const b = arm.part('base-servo', (await lib.fromSTL('${dir}/Base_Motor.stl')).scale(1000));
      a.connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, -32.7, 46.5] } });
      b.connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, -32.7, 49.5] } });
      arm.mate('fix', 'base.s', 'base-servo.s', 'fastened');
      return arm.solvedModel({}, { ignore: [['base', 'base-servo']] });
    `;
    const result = await evaluateScriptTool({ code, file: 'examples/robot-arm/so100/pair.kcad.ts' });
    const hit = result.diagnostics.find((d) => d.code === 'mechanism.rest-interpenetration');
    expect(hit?.message).toContain("'base' and 'base-servo'");
    expect(result.ok).toBe(false);
  }, 600_000);
});
