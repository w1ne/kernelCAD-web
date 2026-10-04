// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure 2D rules behind the architectural plan sheet: scanline wall / opening
// chains, room detection from loop nesting, unit detection and feet-inches.

import { describe, it, expect } from 'vitest';
import {
  chainBreakpoints,
  detectPlanUnits,
  detectRooms,
  formatFeetInches,
  formatPlanArea,
  labelPoint,
  loopToPolygon,
  pickPlanScale,
  pointInPolygon,
  scanIntervals,
  type P2,
} from '../../../../src/kernel/backends/occt/drawingPlanGeometry';

const rect = (x0: number, y0: number, x1: number, y1: number): P2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe('drawingPlanGeometry', () => {
  it('reads wall and opening widths along an exterior side', () => {
    // South wall 0..6000 with a 1000 mm door at 1000..2000 → two wall pieces.
    const polys = [rect(0, 0, 1000, 200), rect(2000, 0, 6000, 200)];
    const iv = scanIntervals(polys, 'x', 10);
    expect(iv).toEqual([[0, 1000], [2000, 6000]]);
    expect(chainBreakpoints(iv)).toEqual([0, 1000, 2000, 6000]);
  });

  it('finds rooms as odd-depth loops with islands subtracted', () => {
    const outer = rect(0, 0, 6000, 4000);
    const roomA = rect(200, 200, 3500, 3800);
    const roomB = rect(3600, 200, 5800, 3800);
    const column = rect(1000, 1000, 1300, 1300);
    const rooms = detectRooms([outer, roomA, roomB, column]);
    expect(rooms.map((r) => Math.round(r.areaMm2 / 1e4) / 100).sort((m, n) => m - n)).toEqual([7.92, 11.79]);
    const a = rooms.find((r) => r.areaMm2 > 1e7)!;
    expect(pointInPolygon(a.labelAt, roomA)).toBe(true);
    expect(pointInPolygon(a.labelAt, column)).toBe(false);
  });

  it('places an L-shaped room label inside the room, not on its centroid', () => {
    const L: P2[] = [[0, 0], [4000, 0], [4000, 1000], [1000, 1000], [1000, 4000], [0, 4000]];
    const p = labelPoint(L);
    expect(pointInPolygon(p, L)).toBe(true);
  });

  it('flattens exact arcs from section loops', () => {
    // Half circle of radius 10 (bulge 1 = 180°) closed by its diameter.
    const poly = loopToPolygon([
      { x0: 10, y0: 0, x1: -10, y1: 0, bulge: 1 },
      { x0: -10, y0: 0, x1: 10, y1: 0 },
    ]);
    expect(poly.length).toBeGreaterThan(10);
    for (const [x, y] of poly) expect(Math.hypot(x, y)).toBeCloseTo(10, 6);
    expect(poly.some(([, y]) => y > 9.9)).toBe(true);
  });

  it('detects imperial models from whole-inch lengths and metric from whole-5 mm', () => {
    expect(detectPlanUnits([6096, 4267.2, 2895.6])).toBe('imperial'); // 20' × 14' × 9'-6"
    expect(detectPlanUnits([6000, 4000, 2850])).toBe('metric');
    expect(detectPlanUnits([])).toBe('metric');
  });

  it('formats feet-inches to the nearest 1/4" and areas per unit system', () => {
    expect(formatFeetInches(3810)).toBe(`12'-6"`);
    expect(formatFeetInches(927.1)).toBe(`3'-0 1/2"`);
    expect(formatFeetInches(120.65)).toBe(`0'-4 3/4"`);
    expect(formatPlanArea(11.88e6, 'metric')).toBe('11.9 m²');
    expect(formatPlanArea(13.9355e6, 'imperial')).toBe('150 ft²');
  });

  it('picks the largest architectural scale that fits', () => {
    expect(pickPlanScale(1 / 22, 'metric').label).toBe('1:25');
    expect(pickPlanScale(1 / 90, 'metric').label).toBe('1:100');
    expect(pickPlanScale(1 / 40, 'imperial').label).toBe(`1/4" = 1'-0"`);
  });
});
