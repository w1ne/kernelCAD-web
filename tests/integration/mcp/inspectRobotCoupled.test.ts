// tests/integration/mcp/inspectRobotCoupled.test.ts
//
// `inspect({ of: 'robot' })` must show which joints a `coupleMates` coupling
// drives. Without it the driven mate reads as an independent joint.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { inspectRobotTool } from '../../../src/agent/mcp/tools/inspectRobot';

const gearbox = (coupling: string): string => `
  const arm = assembly('gearbox');
  arm.part('base', box(24, 4, 4), { density: 2700 })
    .connector('input', { type: 'axis', origin: { kind: 'vec3', value: [2, 2, 4] }, axis: [0, 0, 1] })
    .connector('output', { type: 'axis', origin: { kind: 'vec3', value: [20, 2, 4] }, axis: [0, 0, 1] });
  arm.part('driver', box(10, 2, 2), { density: 2700 })
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.part('driven', box(12, 3, 3), { density: 2700 })
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.mate('input', 'base.input', 'driver.axis', 'revolute', { pose: 30, limitsDeg: [-90, 90] });
  arm.mate('output', 'base.output', 'driven.axis', 'revolute', { limitsDeg: [-180, 180] });
  ${coupling}
  return arm.model();
`;

describe('inspect_robot coupled mates', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports the coupling on the driven joint only', async () => {
    const r = await inspectRobotTool({
      code: gearbox(`arm.coupleMates('output', { source: 'input', ratio: -2, offset: 5 });`),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const input = r.joints.find((j) => j.name === 'input');
    const output = r.joints.find((j) => j.name === 'output');
    expect(input?.coupling).toBeUndefined();
    expect(output?.coupling).toEqual({ source: 'input', ratio: -2, offset: 5 });
  });

  it('omits the offset when the coupling declares none', async () => {
    const r = await inspectRobotTool({
      code: gearbox(`arm.coupleMates('output', { source: 'input', ratio: 0.5 });`),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const output = r.joints.find((j) => j.name === 'output');
    expect(output?.coupling).toEqual({ source: 'input', ratio: 0.5 });
  });
});
