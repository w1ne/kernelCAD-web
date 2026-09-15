// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { identifyViews, sheetToModel } from './views';
import { projectionSymbol, type ClassifiedPath } from './sheet';
import type { PositionedText, Pt } from './pdfVectors';

let nextId = 0;
function rect(x0: number, y0: number, w: number, h: number): ClassifiedPath {
  const points: Pt[] = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]];
  return {
    id: nextId++, cls: 'visible', points, closed: true, widthMm: 0.5, dash: [], stroked: true, filled: false, curved: false,
    bbox: { x0, y0, x1: x0 + w, y1: y0 + h },
  };
}
const label = (text: string, x: number, y: number): PositionedText => ({ text, x, y, dir: [1, 0], sizeMm: 2.6, widthMm: text.length * 1.6 });

// A 80 (X) × 50 (Y) × 8 (Z) plate laid out on a sheet: front at y 120..128.
const FRONT = rect(100, 120, 80, 8);
const PLAN_ABOVE = rect(100, 50, 80, 50);
const SIDE_LEFT = rect(30, 120, 50, 8);

describe('identifyViews', () => {
  it('names a third-angle layout front / top / left and maps model axes', () => {
    const vs = identifyViews([FRONT, PLAN_ABOVE, SIDE_LEFT], [], 'third');
    const byName = Object.fromEntries(vs.views.map(v => [v.name, v]));
    expect(Object.keys(byName).sort()).toEqual(['front', 'left', 'top']);
    // Plan above the front: its bottom edge is the part's front face (Y = 0).
    expect(sheetToModel(byName.top, [100, 100], 1)).toEqual({ u: 0, v: 0 });
    expect(sheetToModel(byName.top, [180, 50], 1)).toEqual({ u: 80, v: 50 });
    // Side view left of the front: its right edge faces the front view (Y = 0).
    expect(byName.left.u.axis).toBe('y');
    expect(sheetToModel(byName.left, [80, 128], 1)).toEqual({ u: 0, v: 0 });
  });

  it('names the same layout bottom / right when the sheet is first-angle', () => {
    const vs = identifyViews([FRONT, PLAN_ABOVE, SIDE_LEFT], [], 'first');
    expect(vs.views.map(v => v.name).sort()).toEqual(['bottom', 'front', 'right']);
  });

  it('reads a lone captioned view by its caption and excludes an isometric', () => {
    const iso: ClassifiedPath = { ...rect(200, 50, 30, 30), points: [[200, 80], [215, 50], [230, 80], [200, 80]] };
    const vs = identifyViews([PLAN_ABOVE, iso], [label('TOP', 130, 105), label('ISOMETRIC', 205, 85)], undefined);
    expect(vs.views).toHaveLength(1);
    expect(vs.views[0]).toMatchObject({ name: 'top', identifiedBy: 'label' });
    expect(vs.pictorials).toHaveLength(1);
  });
});

describe('projectionSymbol', () => {
  const circle = (cx: number, r: number) => ({
    points: Array.from({ length: 33 }, (_, i) => [cx + r * Math.cos((i / 32) * 2 * Math.PI), 10 + r * Math.sin((i / 32) * 2 * Math.PI)] as Pt),
    closed: true, widthMm: 0.25, dash: [], stroked: true, filled: false, curved: false,
  });
  const trapezoid = (narrowRight: boolean) => ({
    points: (narrowRight
      ? [[0, 6.6], [7, 8.1], [7, 11.9], [0, 13.4], [0, 6.6]]
      : [[0, 8.1], [7, 6.6], [7, 13.4], [0, 11.9], [0, 8.1]]) as Pt[],
    closed: true, widthMm: 0.25, dash: [], stroked: true, filled: false, curved: false,
  });

  it('reads the end view beside the narrow end as third-angle, beside the wide end as first-angle', () => {
    expect(projectionSymbol([trapezoid(true), circle(17.5, 3.4), circle(17.5, 1.9)])).toBe('third');
    expect(projectionSymbol([trapezoid(false), circle(17.5, 3.4), circle(17.5, 1.9)])).toBe('first');
  });
});
