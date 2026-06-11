// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { listPartFamiliesTool } from './listPartFamilies';

describe('list_part_families MCP tool', () => {
  it('returns all bundled families when no filter', async () => {
    const r = await listPartFamiliesTool({});
    expect(r.ok).toBe(true);
    const names = r.families.map((f) => f.name);
    expect(names).toContain('socket-head-cap-screw');
    expect(names).toContain('deep-groove-ball-bearing');
    expect(names).toContain('stepper-motor');
  });

  it('filters by category', async () => {
    const r = await listPartFamiliesTool({ category: 'fastener' });
    expect(r.families.every((f) => f.category === 'fastener')).toBe(true);
    const names = r.families.map((f) => f.name);
    expect(names).toContain('socket-head-cap-screw');
    expect(names).toContain('button-head-cap-screw');
  });
});
