// tests/integration/mcp/listMatesCoupled.test.ts
//
// `list_mates` must show which mates a `coupleMates` coupling drives. Without
// it the driven mate reads as an independent joint with its own limits.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { listMatesTool } from '../../../src/agent/mcp/tools/listMates';

describe('list_mates coupled mates', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('reports the coupling on the driven mate only', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('gearbox');
        arm.part('base', box(24, 4, 4))
          .connector('input', { type: 'axis', origin: { kind: 'vec3', value: [2, 2, 4] }, axis: [0, 0, 1] })
          .connector('output', { type: 'axis', origin: { kind: 'vec3', value: [20, 2, 4] }, axis: [0, 0, 1] });
        arm.part('driver', box(10, 2, 2))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driven', box(12, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('input', 'base.input', 'driver.axis', 'revolute', { pose: 30, limitsDeg: [-90, 90] });
        arm.mate('output', 'base.output', 'driven.axis', 'revolute', { limitsDeg: [-180, 180] });
        arm.coupleMates('output', { source: 'input', ratio: -2, offset: 5 });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await listMatesTool({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const input = r.mates.find((m) => m.name === 'input');
    const output = r.mates.find((m) => m.name === 'output');
    expect(input?.coupling).toBeUndefined();
    expect(output?.coupling).toEqual({ source: 'input', ratio: -2, offset: 5 });
  });

  it('omits the offset when the coupling declares none', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('gearbox');
        arm.part('base', box(24, 4, 4))
          .connector('input', { type: 'axis', origin: { kind: 'vec3', value: [2, 2, 4] }, axis: [0, 0, 1] })
          .connector('output', { type: 'axis', origin: { kind: 'vec3', value: [20, 2, 4] }, axis: [0, 0, 1] });
        arm.part('driver', box(10, 2, 2))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driven', box(12, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('input', 'base.input', 'driver.axis', 'revolute', { pose: 0 });
        arm.mate('output', 'base.output', 'driven.axis', 'revolute');
        arm.coupleMates('output', { source: 'input', ratio: 3 });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await listMatesTool({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mates.find((m) => m.name === 'output')?.coupling).toEqual({ source: 'input', ratio: 3 });
  });
});
