// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { emitMillGcode, planMill, type CamSegment } from './index';

const PART = { min_mm: [0, 0, 0] as [number, number, number], max_mm: [40, 30, 10] as [number, number, number] };
const PLATE = { kind: 'plate' as const, lengthMm: 50, widthMm: 40, thicknessMm: 15 };

function feedsAt(segments: CamSegment[], z: number): Array<[number, number, number]> {
  return segments
    .filter(segment => segment.motion === 'feed' && segment.z_mm === z)
    .map(segment => [segment.x_mm, segment.y_mm, segment.z_mm]);
}

describe('planMill bbox toolpaths', () => {
  it('faces the stock top down to the part top and profiles the part rectangle', () => {
    const plan = planMill({
      part_bbox: PART,
      stock: PLATE,
      tool: { diameter_mm: 6 },
      ops: ['facing', 'profile'],
      stepdown_mm: 5,
      stepover: 0.5,
      safe_z_mm: 20,
      spindle_rpm: 10000,
      feed_mm_min: 600,
    });

    expect(plan.ok, plan.ok ? '' : plan.error).toBe(true);
    if (!plan.ok) return;
    expect(plan.origin).toBe('stock_corner');
    expect(plan.part_in_stock_mm).toEqual({
      min_mm: [5, 5, 0],
      max_mm: [45, 35, 10],
    });
    expect(plan.disclaimer).toMatch(/bbox 2\.5D heuristic/);
    expect(plan.disclaimer).toMatch(/not collision-checked/);
    expect(plan.disclaimer).toMatch(/not a machine-ready post/);

    const facing = plan.ops.find(op => op.kind === 'facing');
    const profile = plan.ops.find(op => op.kind === 'profile');
    expect(facing?.removed_volume_mm3).toBe(10000);
    expect(feedsAt(facing?.segments ?? [], 10).length).toBeGreaterThan(0);
    for (const [x, y, z] of feedsAt(facing?.segments ?? [], 10)) {
      expect(z).toBe(10);
      expect(x).toBeGreaterThanOrEqual(3);
      expect(x).toBeLessThanOrEqual(47);
      expect(y).toBeGreaterThanOrEqual(3);
      expect(y).toBeLessThanOrEqual(37);
    }
    expect(feedsAt(facing?.segments ?? [], 15)).toEqual([]);

    expect(feedsAt(profile?.segments ?? [], 10)).toEqual([
      [2, 2, 10],
      [48, 2, 10],
      [48, 38, 10],
      [2, 38, 10],
      [2, 2, 10],
    ]);
    expect(feedsAt(profile?.segments ?? [], 5).map(point => point[2])).toEqual([5, 5, 5, 5, 5]);
    expect(feedsAt(profile?.segments ?? [], 0).map(point => [point[0], point[1]])).toEqual([
      [2, 2],
      [48, 2],
      [48, 38],
      [2, 38],
      [2, 2],
    ]);
    expect(profile?.removed_volume_mm3).toBe(14760);
    expect(plan.time_s).toBeGreaterThan(0);
    expect(plan.warnings.join(' ')).toMatch(/proxy/i);
  });

  it('reverses the outside profile when conventional milling is requested', () => {
    const plan = planMill({
      part_bbox: PART,
      stock: PLATE,
      tool: { diameter_mm: 6 },
      ops: ['profile'],
      stepdown_mm: 15,
      safe_z_mm: 20,
      conventional: true,
    });
    expect(plan.ok, plan.ok ? '' : plan.error).toBe(true);
    if (!plan.ok) return;
    const profile = plan.ops[0];
    expect(feedsAt(profile.segments, 0).map(point => [point[0], point[1]])).toEqual([
      [2, 2],
      [2, 38],
      [48, 38],
      [48, 2],
      [2, 2],
    ]);
  });

  it('rasters a pocket inside the part footprint down to the requested floor', () => {
    const plan = planMill({
      part_bbox: { min_mm: [0, 0, 0], max_mm: [20, 20, 10] },
      stock: { kind: 'plate', lengthMm: 30, widthMm: 30, thicknessMm: 12 },
      tool: { diameter_mm: 4 },
      ops: ['pocket'],
      stepdown_mm: 4,
      stepover: 0.5,
      pocket_floor_z_mm: 4,
      safe_z_mm: 18,
    });
    expect(plan.ok, plan.ok ? '' : plan.error).toBe(true);
    if (!plan.ok) return;
    const pocket = plan.ops[0];
    expect(pocket.removed_volume_mm3).toBe(3200);
    const cuts = pocket.segments.filter(segment => segment.motion === 'feed' && segment.z_mm <= 12);
    expect(cuts.length).toBeGreaterThan(0);
    for (const segment of cuts) {
      expect(segment.x_mm).toBeGreaterThanOrEqual(7);
      expect(segment.x_mm).toBeLessThanOrEqual(23);
      expect(segment.y_mm).toBeGreaterThanOrEqual(7);
      expect(segment.y_mm).toBeLessThanOrEqual(23);
    }
    expect(pocket.segments.some(segment => segment.motion === 'feed' && segment.z_mm === 4)).toBe(true);
  });

  it('refuses stock that cannot contain the part', () => {
    const plan = planMill({
      part_bbox: PART,
      stock: { kind: 'plate', lengthMm: 30, widthMm: 20, thicknessMm: 8 },
      tool: { diameter_mm: 6 },
      ops: ['facing', 'profile'],
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.errorCode).toBe('cli.invalid-args');
    expect(plan.error).toMatch(/stock/i);
    expect(plan.disclaimer).toMatch(/bbox 2\.5D heuristic/);
  });

  it('refuses a non-positive tool and filament stock', () => {
    const tool = planMill({
      part_bbox: PART,
      stock: PLATE,
      tool: { diameter_mm: 0 },
      ops: ['facing'],
    });
    expect(tool.ok).toBe(false);
    if (!tool.ok) expect(tool.errorCode).toBe('cli.invalid-args');

    const filament = planMill({
      part_bbox: PART,
      stock: { kind: 'filament', diameterMm: 1.75 },
      tool: { diameter_mm: 6 },
      ops: ['profile'],
    });
    expect(filament.ok).toBe(false);
    if (!filament.ok) {
      expect(filament.errorCode).toBe('cli.invalid-args');
      expect(filament.error).toMatch(/filament/i);
    }
  });

  it('uses G81 for a shallow hole and G83 when the hole is deeper than three diameters', () => {
    const shallow = planMill({
      part_bbox: PART,
      stock: PLATE,
      tool: { diameter_mm: 3 },
      ops: ['drill'],
      holes: [{ x_mm: 10, y_mm: 12, depth_mm: 8 }],
      safe_z_mm: 20,
      feed_mm_min: 200,
    });
    expect(shallow.ok, shallow.ok ? '' : shallow.error).toBe(true);
    if (!shallow.ok) return;
    const shallowCode = emitMillGcode(shallow);
    expect(shallowCode).toContain('G81 X10.000 Y12.000 Z7.000 R20.000 F100');
    expect(shallowCode).not.toContain('G83');

    const deep = planMill({
      part_bbox: PART,
      stock: PLATE,
      tool: { diameter_mm: 3 },
      ops: ['drill'],
      holes: [{ x_mm: 10, y_mm: 12, depth_mm: 12 }],
      safe_z_mm: 20,
      feed_mm_min: 200,
    });
    expect(deep.ok, deep.ok ? '' : deep.error).toBe(true);
    if (!deep.ok) return;
    const deepCode = emitMillGcode(deep);
    expect(deepCode).toContain('G83 X10.000 Y12.000 Z3.000 R20.000 Q3.000 F100');
    expect(deepCode).toContain('G80');
  });
});

describe('emitMillGcode', () => {
  it('writes mill units, absolute mode, and safe-Z retracts', () => {
    const plan = planMill({
      part_bbox: PART,
      stock: PLATE,
      tool: { diameter_mm: 6 },
      ops: ['facing', 'profile'],
      stepdown_mm: 5,
      stepover: 0.5,
      safe_z_mm: 20,
      spindle_rpm: 10000,
      feed_mm_min: 600,
    });
    expect(plan.ok, plan.ok ? '' : plan.error).toBe(true);
    if (!plan.ok) return;
    const gcode = emitMillGcode(plan);
    expect(gcode).toContain('G21');
    expect(gcode).toContain('G90');
    expect(gcode).not.toContain('G20');
    expect(gcode).toContain('G0 Z20.000');
    expect(gcode).toContain('M3 S10000');
    expect(gcode).toContain('M5');
    expect(gcode).toContain('G1 Z10.000 F300');
    expect(gcode).toMatch(/bbox 2\.5D heuristic/);
    expect(gcode).not.toMatch(/\bE[0-9]/);
    expect(plan.gcode).toBeUndefined();
  });
});
