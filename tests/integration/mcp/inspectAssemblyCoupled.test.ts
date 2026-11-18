// tests/integration/mcp/inspectAssemblyCoupled.test.ts
//
// inspect({ of: 'assembly' }) must show which mates a `coupleMates` coupling
// drives. Without it the driven mate reads as an independent joint.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';

const gearbox = (coupling: string) => `
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
  ${coupling}
  return arm.model();
`;

describe('inspect of:assembly coupled mates', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports the coupling on the driven mate only', async () => {
    const r = await inspectAssemblyTool({
      code: gearbox("arm.coupleMates('output', { source: 'input', ratio: -2, offset: 5 });"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mates.find((m) => m.name === 'input')?.coupling).toBeUndefined();
    expect(r.mates.find((m) => m.name === 'output')?.coupling).toEqual({ source: 'input', ratio: -2, offset: 5 });
  });

  it('omits the offset when the coupling declares none', async () => {
    const r = await inspectAssemblyTool({
      code: gearbox("arm.coupleMates('output', { source: 'input', ratio: 3 });"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mates.find((m) => m.name === 'output')?.coupling).toEqual({ source: 'input', ratio: 3 });
  });

  it('adds no coupling field when no coupling is declared', async () => {
    const r = await inspectAssemblyTool({ code: gearbox('') });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mates.every((m) => !('coupling' in m))).toBe(true);
  });
});
