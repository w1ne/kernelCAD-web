// The SO-100 hero arm used to paint with links through each other and
// still evaluate ok: its pose sweep is over budget and every parent/child
// pair was on the interference ignore list. The rest-pose contact gate
// runs regardless of budget and ignores that list, so this pins the
// seated meshes (parts/sim-seated/, parts/seat_meshes.py): no shared
// volume above the cap, every mate touching, verdict not 'broken'.
// Own file: one process can build the arm only once (see parts/README.md).

import { describe, expect, it } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('SO-100 arm rest-pose contact', () => {
  it('has no interpenetrating or floating parts at rest', async () => {
    const result = await evaluateScriptTool({ file: 'examples/robot-arm/so100/so100-arm.kcad.ts' });
    const failures = result.diagnostics.filter((d) => d.severity === 'error');
    expect(failures.map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(result.ok).toBe(true);
    expect((result as { mechanism?: string }).mechanism).not.toBe('broken');
  }, 1_500_000);

  it('fails the unseated vendor base and pan servo, naming the pair', async () => {
    // The vendor sim meshes as shipped share ~21 mm³ (exact manifold
    // boolean: 23.8 mm³), over the 20 mm³ cap. `ignore` must not hide it.
    const dir = `${process.cwd()}/examples/robot-arm/so100/parts/sim`;
    const code = `
      const arm = assembly('pair');
      const a = arm.part('base', (await lib.fromSTL('${dir}/Base.stl', { allowOpen: true })).scale(1000));
      const b = arm.part('base-servo', (await lib.fromSTL('${dir}/Base_Motor.stl')).scale(1000));
      a.connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, -32.7, 46.5] } });
      b.connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, -32.7, 46.5] } });
      arm.mate('fix', 'base.s', 'base-servo.s', 'fastened');
      return arm.solvedModel({}, { ignore: [['base', 'base-servo']] });
    `;
    const result = await evaluateScriptTool({ code, file: 'examples/robot-arm/so100/pair.kcad.ts' });
    const hit = result.diagnostics.find((d) => d.code === 'mechanism.rest-interpenetration');
    expect(hit?.message).toContain("'base' and 'base-servo'");
    expect(result.ok).toBe(false);
  }, 600_000);
});
