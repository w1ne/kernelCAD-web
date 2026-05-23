import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { inspectRobotTool } from '../../../src/agent/mcp/tools/inspectRobot';

describe('inspect_robot MCP tool (Task B3.E)', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns links + joints from a 2-DOF arm assembly', async () => {
    const code = `
      const arm = assembly('two-link');
      const base = arm.part('base', box(30, 30, 8), { density: 2700 });
      const upper = arm.part('upper', box(80, 12, 8), { density: 2700 });
      arm.revolute('shoulder', base, upper, { axis: [0, 0, 1], origin: [0, 0, 8], limitsDeg: [-90, 90] });
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
      arm.revolute('ab', a, b, { axis: [0,0,1], origin: [10,0,0] });
      arm.revolute('bc', b, c, { axis: [0,0,1], origin: [10,0,0] });
      arm.revolute('cd', c, d, { axis: [0,0,1], origin: [10,0,0] });
      arm.revolute('da', d, a, { axis: [0,0,1], origin: [10,0,0] });
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
