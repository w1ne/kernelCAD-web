// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { applySurfaceBlendTool } from './applySurfaceBlend';

describe('apply_surface_blend', () => {
  beforeAll(async () => { await initOcct(); });

  it('authors a selected G2 fillet through Shape.fillet and evaluates it', async () => {
    const out = await applySurfaceBlendTool({
      code: 'const body = box(20, 20, 20);\nreturn body;',
      shape_binding: 'body', radius: 2, selector: { face: 'top' }, continuity: 'G2',
    });
    expect(out.new_code).toContain('body.fillet(2, {"face":"top"}, { continuity: "G2" })');
    expect(out.operation).toBe('fillet');
    expect(out.diagnostics?.filter(d => d.severity === 'error')).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it('authors a chamfer through Shape.chamfer and rejects missing dimensions', async () => {
    const out = await applySurfaceBlendTool({
      code: 'const body = box(20, 20, 20);\nreturn body;',
      shape_binding: 'body', operation: 'chamfer', distance: 1, selector: { face: 'top' },
    });
    expect(out.new_code).toContain('body.chamfer(1, {"face":"top"})');
    expect(out.ok).toBe(true);
    await expect(applySurfaceBlendTool({
      code: 'return box(2, 2, 2);', shape_binding: 'body', operation: 'chamfer',
    })).resolves.toMatchObject({ ok: false, error: expect.stringContaining('distance') });
  });
});
