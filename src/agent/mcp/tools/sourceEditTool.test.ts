// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/sourceEditTool.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { evaluateSourceEdit } from './sourceEditTool';

// evaluateSourceEdit is the shared helper behind add_assembly_part,
// add_part_connector, add_mate, add_mate_coupling, add_transmission,
// add_workspace_target and set_scene_return. It must report `ok` from the
// re-evaluation of the spliced source, not assume success.
describe('evaluateSourceEdit — ok reflects evaluation', () => {
  beforeAll(async () => { await initOcct(); });

  it('passes an upstream edit failure straight through', async () => {
    const out = await evaluateSourceEdit({ ok: false, error: 'no return statement' });
    expect(out).toEqual({ ok: false, error: 'no return statement' });
  });

  it('reports ok:true when the edited source evaluates clean', async () => {
    const out = await evaluateSourceEdit({ ok: true, new_code: 'return box(10, 10, 10);' });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.new_code).toBe('return box(10, 10, 10);');
  });

  it('reports ok:false when the edited source fails evaluation, keeping new_code + diagnostics', async () => {
    const new_code = [
      'const boom = (box(1, 1, 1) as any).definitelyNotAMethod();',
      'return box(10, 10, 10);',
    ].join('\n');
    const out = await evaluateSourceEdit({ ok: true, new_code });
    expect(out.ok).toBe(false);
    // Even on failure the agent needs the spliced code + diagnostics to repair.
    if (!('error' in out)) {
      expect(out.new_code).toBe(new_code);
      expect(out.diagnostics.length).toBeGreaterThan(0);
    }
  });
});
