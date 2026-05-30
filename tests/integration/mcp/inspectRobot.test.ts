import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { inspectRobotTool } from '../../../src/agent/mcp/tools/inspectRobot';

describe('inspect_robot MCP tool (Task B3.E, G0 migrated to mate API)', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns links + joints from a 2-DOF arm assembly', async () => {
    const code = `
      const arm = assembly('two-link');
      const base = arm.part('base', box(30, 30, 8), { density: 2700 });
      const upper = arm.part('upper', box(80, 12, 8), { density: 2700 });
      base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 8] }, axis: [0, 0, 1] });
      upper.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('shoulder', 'base.shoulder', 'upper.shoulder', 'revolute', { limitsDeg: [-90, 90] });
      return arm.model();
    `;
    const r = await inspectRobotTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('not ok');
    expect(r.links.map(l => l.name).sort()).toEqual(['base', 'upper']);
    expect(r.joints).toHaveLength(1);
    expect(r.joints[0].name).toBe('shoulder');
    expect(r.joints[0].type).toBe('revolute');
    expect(r.joints[0].limitsRad).toBeDefined();
  });

  it('surfaces export.urdf.closed-loop in openIssues for a 4-bar', async () => {
    const code = `
      const arm = assembly('4bar');
      const a = arm.part('a', box(10, 10, 10), { density: 2700 });
      const b = arm.part('b', box(10, 10, 10), { density: 2700 });
      const c = arm.part('c', box(10, 10, 10), { density: 2700 });
      const d = arm.part('d', box(10, 10, 10), { density: 2700 });
      a.connector('ab_a', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
      b.connector('ab_b', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      b.connector('bc_b', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
      c.connector('bc_c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      c.connector('cd_c', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
      d.connector('cd_d', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      d.connector('da_d', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
      a.connector('da_a', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('ab', 'a.ab_a', 'b.ab_b', 'revolute');
      arm.mate('bc', 'b.bc_b', 'c.bc_c', 'revolute');
      arm.mate('cd', 'c.cd_c', 'd.cd_d', 'revolute');
      arm.mate('da', 'd.da_d', 'a.da_a', 'revolute');
      return arm.model();
    `;
    const r = await inspectRobotTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('not ok');
    expect(r.openIssues.map(i => i.code)).toContain('export.urdf.closed-loop');
  });

  it('returns empty planningGroups + endEffectors when none declared', async () => {
    const code = `
      const arm = assembly('a');
      const base = arm.part('base', box(10, 10, 10), { density: 2700 });
      return arm.model();
    `;
    const r = await inspectRobotTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('not ok');
    expect(r.planningGroups).toEqual([]);
    expect(r.endEffectors).toEqual([]);
  });
});
