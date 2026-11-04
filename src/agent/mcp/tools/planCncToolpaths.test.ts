// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { callMcpTool } from '../toolRegistry';
import { planCncToolpathsTool } from './planCncToolpaths';

const PLATE = { kind: 'plate', length_mm: 50, width_mm: 40, thickness_mm: 15 };

describe('plan_cnc_toolpaths arguments', () => {
  it('refuses a missing stock and a non-positive tool before planning', async () => {
    const missing = await planCncToolpathsTool({ code: 'return box(10, 10, 10);', tool_diameter_mm: 6 });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.errorCode).toBe('cli.invalid-args');
    expect(missing.error).toMatch(/stock/i);
    expect(missing.disclaimer).toMatch(/bbox 2\.5D heuristic/);

    const tool = await planCncToolpathsTool({
      code: 'return box(10, 10, 10);',
      stock: PLATE,
      tool_diameter_mm: 0,
    });
    expect(tool.ok).toBe(false);
    if (!tool.ok) expect(tool.error).toMatch(/tool_diameter_mm/);
  });
});

describe('plan_cnc_toolpaths on a box', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('plans facing and profile for a plate and can emit mill G-code', async () => {
    const plan = await callMcpTool('plan_cnc_toolpaths', {
      code: 'return box(40, 30, 10);',
      stock: PLATE,
      tool_diameter_mm: 6,
      ops: ['facing', 'profile'],
      stepdown_mm: 5,
      stepover: 0.5,
      safe_z_mm: 20,
      spindle_rpm: 10000,
      feed_mm_min: 600,
      include_gcode: true,
    }) as {
      ok: boolean;
      error?: string;
      part_bbox?: { size_mm: number[] };
      part_in_stock_mm?: { min_mm: number[] };
      gcode?: string;
      removed_volume_mm3?: number;
    };
    expect(plan.ok, plan.error ?? '').toBe(true);
    expect(plan.part_bbox?.size_mm.map(value => Math.round(value))).toEqual([40, 30, 10]);
    expect(plan.part_in_stock_mm?.min_mm.map(value => Math.round(value))).toEqual([5, 5, 0]);
    expect(plan.removed_volume_mm3).toBe(24760);
    expect(plan.gcode).toContain('G21');
    expect(plan.gcode).toContain('G90');
    expect(plan.gcode).toContain('G0 Z20.000');
    expect(plan.gcode).not.toMatch(/\bE[0-9]/);
  });

  it('refuses stock that is smaller than the part', async () => {
    const plan = await callMcpTool('plan_cnc_toolpaths', {
      code: 'return box(40, 30, 10);',
      stock: { kind: 'plate', length_mm: 30, width_mm: 20, thickness_mm: 8 },
      tool_diameter_mm: 6,
      ops: ['profile'],
    }) as { ok: boolean; errorCode?: string; error?: string };
    expect(plan.ok).toBe(false);
    expect(plan.errorCode).toBe('cli.invalid-args');
    expect(plan.error).toMatch(/stock/i);
  });
});
