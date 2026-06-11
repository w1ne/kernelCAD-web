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
    expect(sdf).toMatch(/<sdf version="1\.10">/);
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

describe('export_model robot formats — companion mesh files land on disk', () => {
  beforeAll(async () => { await initOcct(); });

  const twoLinkBody = `
    const arm = assembly('twolink');
    const base = arm.part('base', box(20, 20, 8), { density: 2700 });
    const upper = arm.part('upper', box(80, 12, 8), { density: 2700 });
    base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0,0,8] }, axis: [0,0,1] });
    upper.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0,0,0] }, axis: [0,0,1] });
    arm.mate('shoulder', 'base.shoulder', 'upper.shoulder', 'revolute', { limitsDeg: [-90, 90] });
    return arm.model();
  `;

  it('sdf-gazebo writes meshes/<part>.stl next to the .sdf so the document is loadable as exported', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-sdf-mesh-'));
    const r = await exportModelTool({
      code: twoLinkBody,
      output_path: join(dir, 'model.sdf'),
      format: 'sdf-gazebo',
    });
    expect(r.ok).toBe(true);
    // The emitted SDF references meshes/<part>.stl by relative uri; if the
    // files are not on disk the simulator fails to resolve every visual and
    // collision. The tool must write them and report their paths.
    expect(r.mesh_files?.length).toBe(2);
    const base = await readFile(join(dir, 'meshes', 'base.stl'));
    const upper = await readFile(join(dir, 'meshes', 'upper.stl'));
    expect(base.byteLength).toBeGreaterThan(84); // binary STL header + >0 tris
    expect(upper.byteLength).toBeGreaterThan(84);
    const sdf = await readFile(join(dir, 'model.sdf'), 'utf8');
    expect(sdf).toMatch(/<uri>meshes\/base\.stl<\/uri><scale>0\.001 0\.001 0\.001<\/scale>/);
  });

  it('urdf writes meshes/<part>.stl next to the .urdf', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-urdf-mesh-'));
    const r = await exportModelTool({
      code: twoLinkBody,
      output_path: join(dir, 'robot.urdf'),
      format: 'urdf',
    });
    expect(r.ok).toBe(true);
    expect(r.mesh_files?.length).toBe(2);
    const base = await readFile(join(dir, 'meshes', 'base.stl'));
    expect(base.byteLength).toBeGreaterThan(84);
  });
});
