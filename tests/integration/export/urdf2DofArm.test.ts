import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

describe('export_model({ format: \'urdf\' }) — 2-DOF planar arm (Task B3)', () => {
  beforeAll(async () => { await initOcct(); });

  it('writes a valid .urdf file with link + joint counts matching the assembly', async () => {
    const code = `
      const arm = assembly('two-link');
      const base = arm.part('base', box(30, 30, 8), { density: 2700 });
      const upper = arm.part('upper', box(80, 12, 8), { density: 2700 });
      const lower = arm.part('lower', box(80, 12, 8), { density: 2700 });
      base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 8] }, axis: [0, 0, 1] });
      upper.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      upper.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [80, 0, 0] }, axis: [0, 0, 1] });
      lower.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('shoulder', 'base.shoulder', 'upper.shoulder', 'revolute', { limitsDeg: [-90, 90] });
      arm.mate('elbow', 'upper.elbow', 'lower.elbow', 'revolute', { limitsDeg: [-135, 135] });
      return arm.model();
    `;
    const dir = await mkdtemp(join(tmpdir(), 'kc-urdf-'));
    const r = await exportModelTool({
      code,
      output_path: join(dir, 'robot.urdf'),
      format: 'urdf',
    });
    expect(r.ok).toBe(true);
    const urdf = await readFile(join(dir, 'robot.urdf'), 'utf8');
    expect(urdf).toMatch(/<robot name="two-link">/);
    expect((urdf.match(/<link /g) ?? []).length).toBe(3);
    expect((urdf.match(/<joint /g) ?? []).length).toBe(2);
    expect(urdf).toMatch(/<joint name="shoulder" type="revolute">/);
  });
});
