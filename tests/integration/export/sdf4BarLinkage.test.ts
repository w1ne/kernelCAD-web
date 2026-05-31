import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

describe('export_model({ format: \'sdf-gazebo\' }) — 4-bar linkage (Task B5)', () => {
  beforeAll(async () => { await initOcct(); });

  const fourBarCode = `
    const arm = assembly('4bar');
    const a = arm.part('a', box(10, 10, 10), { density: 2700 });
    const b = arm.part('b', box(10, 10, 10), { density: 2700 });
    const c = arm.part('c', box(10, 10, 10), { density: 2700 });
    const d = arm.part('d', box(10, 10, 10), { density: 2700 });
    a.connector('ab_a', { type: 'axis', origin: { kind: 'vec3', value: [10,0,0] }, axis: [0,0,1] });
    b.connector('ab_b', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,0,1] });
    b.connector('bc_b', { type: 'axis', origin: { kind: 'vec3', value: [10,0,0] }, axis: [0,0,1] });
    c.connector('bc_c', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,0,1] });
    c.connector('cd_c', { type: 'axis', origin: { kind: 'vec3', value: [10,0,0] }, axis: [0,0,1] });
    d.connector('cd_d', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,0,1] });
    d.connector('da_d', { type: 'axis', origin: { kind: 'vec3', value: [10,0,0] }, axis: [0,0,1] });
    a.connector('da_a', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,0,1] });
    arm.mate('ab', 'a.ab_a', 'b.ab_b', 'revolute');
    arm.mate('bc', 'b.bc_b', 'c.bc_c', 'revolute');
    arm.mate('cd', 'c.cd_c', 'd.cd_d', 'revolute');
    arm.mate('da', 'd.da_d', 'a.da_a', 'revolute');
    return arm.model();
  `;

  it('exports a closed-loop 4-bar that URDF would refuse', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-sdf-'));
    const r = await exportModelTool({
      code: fourBarCode,
      output_path: join(dir, 'model.sdf'),
      format: 'sdf-gazebo',
    });
    expect(r.ok).toBe(true);
    const sdf = await readFile(join(dir, 'model.sdf'), 'utf8');
    expect(sdf).toMatch(/<sdf version="1\.12">/);
    // All 4 joints survive — closed loop preserved.
    expect((sdf.match(/<joint /g) ?? []).length).toBe(4);
  });

  it('the same 4-bar linkage fails URDF export with export.urdf.closed-loop', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-sdf-fail-'));
    const r = await exportModelTool({
      code: fourBarCode,
      output_path: join(dir, 'should-fail.urdf'),
      format: 'urdf',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics?.map(d => d.code)).toContain('export.urdf.closed-loop');
  });
});
