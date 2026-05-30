import { describe, it, expect } from 'vitest';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateUrdfTool } from '../../../src/agent/mcp/tools/validateUrdf';

describe('validate_urdf MCP tool (Task B3.D)', () => {
  it('accepts a minimal well-formed URDF tree', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-vu-'));
    const path = join(dir, 'ok.urdf');
    await writeFile(path, `<?xml version="1.0"?>
<robot name="x">
  <link name="a"/>
  <link name="b"/>
  <joint name="j" type="fixed"><parent link="a"/><child link="b"/></joint>
</robot>`);
    const r = await validateUrdfTool({ urdf_path: path });
    expect(r.ok).toBe(true);
    expect(r.linkCount).toBe(2);
    expect(r.jointCount).toBe(1);
    expect(r.rootLinks).toEqual(['a']);
  });

  it('rejects a URDF where a joint references an unknown link', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-vu-'));
    const path = join(dir, 'bad.urdf');
    await writeFile(path, `<?xml version="1.0"?>
<robot name="x">
  <link name="a"/>
  <joint name="j" type="fixed"><parent link="a"/><child link="ghost"/></joint>
</robot>`);
    const r = await validateUrdfTool({ urdf_path: path });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toMatch(/dangling-link-ref|joint-link-not-found/);
  });

  it('rejects a URDF with duplicate link names', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-vu-'));
    const path = join(dir, 'dup.urdf');
    await writeFile(path, `<?xml version="1.0"?>
<robot name="x">
  <link name="a"/>
  <link name="a"/>
</robot>`);
    const r = await validateUrdfTool({ urdf_path: path });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toMatch(/duplicate-link/);
  });

  it('detects a closed loop (a link with two parent joints)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-vu-'));
    const path = join(dir, 'loop.urdf');
    await writeFile(path, `<?xml version="1.0"?>
<robot name="x">
  <link name="a"/>
  <link name="b"/>
  <link name="c"/>
  <joint name="ab" type="fixed"><parent link="a"/><child link="c"/></joint>
  <joint name="bc" type="fixed"><parent link="b"/><child link="c"/></joint>
</robot>`);
    const r = await validateUrdfTool({ urdf_path: path });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toMatch(/closed-loop|multi-parent/);
  });
});
