import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

describe('export_model({ format: \'sdf-gazebo\' }) — 4-bar linkage (Task B5)', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports a closed-loop 4-bar that URDF would refuse', async () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'kc-sdf-'));
    const r = await exportModelTool({
      code,
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
    const dir = await mkdtemp(join(tmpdir(), 'kc-sdf-fail-'));
    const r = await exportModelTool({
      code,
      output_path: join(dir, 'should-fail.urdf'),
      format: 'urdf',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics?.map(d => d.code)).toContain('export.urdf.closed-loop');
  });
});
