// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { verifyTool } from './verify';

describe('verify edge-radius integration', () => {
  it('runs the actual R2 workflow through verify', async () => {
    const code = 'return box(20,30,10).fillet(2);';
    expect(await verifyTool({ check: 'edge-radius', code, min_radius_mm: 1 })).toMatchObject({ ok: true, source: 'local', checkedFillets: 20 });
    expect(await verifyTool({ check: 'edge-radius', code, min_radius_mm: 3 })).toMatchObject({ ok: false, status: 'fail' });
    expect(await verifyTool({ check: 'edge-radius', code: 'return box(20,30,10);', require_edge_break: 'external' })).toMatchObject({ ok: false, status: 'fail', checkedEdges: 12 });
  });
  it('returns invalid args and evaluation errors without green coverage', async () => {
    expect(await verifyTool({ check: 'edge-radius', code: 'return box(20,30,10);' })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
    expect(await verifyTool({ check: 'edge-radius', code: 'throw new Error("bad source");', min_radius_mm: 1 })).toMatchObject({ ok: false, error: expect.stringContaining('bad source') });
    expect(await verifyTool({ check: 'edge-radius', min_radius_mm: 1 })).toMatchObject({ ok: false });
  });
});
