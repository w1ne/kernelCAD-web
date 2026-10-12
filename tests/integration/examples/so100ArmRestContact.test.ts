// The SO-100 hero arm used to paint with links through each other and
// still evaluate ok: its pose sweep is over budget and every parent/child
// pair was on the interference ignore list. The rest-pose contact gate
// runs regardless of budget and ignores that list, so this pins the
// seated meshes (parts/sim-seated/, parts/seat_meshes.py): no shared
// volume above the cap, every mate touching, verdict not 'broken'.
// Own file: one process can build the arm only once (see parts/README.md).

import { describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100-arm.kcad.ts';

// Hosted here instead of the example-sweep shards (HOSTED_IN_DEDICATED_FILE):
// loading thirteen STL solids and measuring every pair takes longer than the
// shards' 600 s per-example budget, so this file runs the same live
// runValidateCli check under its own cap.
describe('SO-100 arm rest-pose contact', () => {
  it('examples/robot-arm/so100/so100-arm.kcad.ts passes the physics-grounded loop', async () => {
    const result = await runValidateCli({
      file: EXAMPLE_PATH,
      json: true,
      includeInterference: true,
      epsilon: 0.01,
      physical: false,
      includePhysics: false,
    });
    const failures = (result.mechanismFailures ?? []).filter((d) => d.severity === 'error');
    expect(failures.map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(['real', 'unverified']).toContain(result.mechanism);
  }, 1_500_000);

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
