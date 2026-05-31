import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

describe('export_model({ format: \'srdf\' }) — 6-DOF arm (Task B4)', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits a planning group, an end-effector, and one User-reason disable_collisions', async () => {
    const code = `
      const arm = assembly('6dof');
      const base = arm.part('base', box(30, 30, 8), { density: 2700 });
      const shoulder = arm.part('shoulder', box(40, 40, 50), { density: 2700 });
      const upper = arm.part('upper', box(80, 12, 8), { density: 2700 });
      const forearm = arm.part('forearm', box(60, 12, 8), { density: 2700 });
      const wrist = arm.part('wrist', box(20, 20, 20), { density: 2700 });
      const tool_tip = arm.part('tool_tip', box(15, 15, 30), { density: 2700 });
      base.connector('j1', { type: 'axis', origin: { kind: 'vec3', value: [0,0,8] }, axis: [0,0,1] });
      shoulder.connector('j1', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,0,1] });
      shoulder.connector('j2', { type: 'axis', origin: { kind: 'vec3', value: [0,0,50] }, axis: [0,1,0] });
      upper.connector('j2', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,1,0] });
      upper.connector('j3', { type: 'axis', origin: { kind: 'vec3', value: [80,0,0] }, axis: [0,1,0] });
      forearm.connector('j3', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,1,0] });
      forearm.connector('j4', { type: 'axis', origin: { kind: 'vec3', value: [60,0,0] }, axis: [1,0,0] });
      wrist.connector('j4', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [1,0,0] });
      wrist.connector('j5', { type: 'axis', origin: { kind: 'vec3', value: [0,0,20] }, axis: [0,1,0] });
      tool_tip.connector('j5', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,1,0] });
      arm.mate('j1', 'base.j1', 'shoulder.j1', 'revolute', { limitsDeg: [-180,180] });
      arm.mate('j2', 'shoulder.j2', 'upper.j2', 'revolute', { limitsDeg: [-90,90] });
      arm.mate('j3', 'upper.j3', 'forearm.j3', 'revolute', { limitsDeg: [-135,135] });
      arm.mate('j4', 'forearm.j4', 'wrist.j4', 'revolute', { limitsDeg: [-180,180] });
      arm.mate('j5', 'wrist.j5', 'tool_tip.j5', 'revolute', { limitsDeg: [-90,90] });
      arm.planningGroup('main', { chain: { baseLink: 'base', tipLink: 'tool_tip' } });
      arm.endEffector('tool', { parentLink: 'tool_tip', group: 'gripper', parentGroup: 'main' });
      arm.disableCollision('forearm', 'wrist', { reason: 'User' });
      return arm.model();
    `;
    const dir = await mkdtemp(join(tmpdir(), 'kc-srdf-'));
    const r = await exportModelTool({
      code,
      output_path: join(dir, 'robot.srdf'),
      format: 'srdf',
    });
    expect(r.ok).toBe(true);
    const srdf = await readFile(join(dir, 'robot.srdf'), 'utf8');
    expect(srdf).toMatch(/<group name="main">/);
    expect(srdf).toMatch(/<chain base_link="base" tip_link="tool_tip"\s*\/>/);
    expect(srdf).toMatch(/<end_effector name="tool" parent_link="tool_tip"/);
    // User-declared override surfaces in the ACM.
    expect(srdf).toMatch(/<disable_collisions link1="forearm" link2="wrist" reason="User"\/>/);
  });
});
