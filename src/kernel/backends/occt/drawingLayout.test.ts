// src/kernel/backends/occt/drawingLayout.test.ts
//
// Pure-math tests for the drawing-sheet 2D layer: coincident-segment dedup,
// segment re-chaining, drawing-scale snapping, third-angle layout alignment,
// and linear-dimension rendering. No OCCT — these run instantly.

import { describe, it, expect } from 'vitest';
import {
  chainSegments,
  computeSheetLayout,
  dedupPolylineClasses,
  dimensionToSvg,
  formatDimValue,
  pickDrawingScale,
  scaleLabel,
  SHEETS,
  viewBoxOfPolylines,
  type Polyline2,
  type ViewBox2,
} from './drawingLayout';

describe('dedupPolylineClasses', () => {
  it('drops an exact duplicate segment from a later class (visible wins over hidden)', () => {
    const visible: Polyline2[] = [[[0, 0], [10, 0]]];
    const hidden: Polyline2[] = [[[0, 0], [10, 0]], [[0, 0], [0, 5]]];
    const [v, h] = dedupPolylineClasses([visible, hidden]);
    expect(v).toHaveLength(1);
    // Only the non-duplicate hidden segment survives.
    expect(h).toHaveLength(1);
    expect(h[0]).toEqual([[0, 0], [0, 5]]);
  });

  it('collapses a reversed duplicate within one class', () => {
    const lines: Polyline2[] = [
      [[0, 0], [10, 0]],
      [[10, 0], [0, 0]],
    ];
    const [out] = dedupPolylineClasses([lines]);
    expect(out).toHaveLength(1);
  });

  it('treats segments within the quantum as coincident', () => {
    const lines: Polyline2[] = [
      [[0, 0], [10, 0]],
      [[0.0000001, 0], [10.0000002, 0]],
    ];
    const [out] = dedupPolylineClasses([lines]);
    expect(out).toHaveLength(1);
  });

  it('drops zero-length segments', () => {
    const [out] = dedupPolylineClasses([[[[5, 5], [5, 5]]]]);
    expect(out).toHaveLength(0);
  });

  it('keeps distinct segments in both classes', () => {
    const [a, b] = dedupPolylineClasses([
      [[[0, 0], [1, 0]]],
      [[[0, 1], [1, 1]]],
    ]);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });
});

describe('chainSegments', () => {
  it('re-chains touching segments into one polyline', () => {
    const out = chainSegments([
      { a: [0, 0], b: [10, 0] },
      { a: [10, 0], b: [10, 5] },
      { a: [10, 5], b: [0, 5] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(4);
  });

  it('chains across reversed orientation', () => {
    const out = chainSegments([
      { a: [0, 0], b: [10, 0] },
      { a: [10, 5], b: [10, 0] }, // reversed relative to the chain direction
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(3);
  });

  it('keeps disconnected segments as separate polylines', () => {
    const out = chainSegments([
      { a: [0, 0], b: [1, 0] },
      { a: [5, 5], b: [6, 5] },
    ]);
    expect(out).toHaveLength(2);
  });
});

describe('pickDrawingScale / scaleLabel', () => {
  it('snaps down to the standard scale series', () => {
    expect(pickDrawingScale(0.7)).toBe(0.5);
    expect(pickDrawingScale(1.3)).toBe(1);
    expect(pickDrawingScale(3)).toBe(2);
    expect(pickDrawingScale(250)).toBe(100);
    expect(pickDrawingScale(0.011)).toBe(0.01);
  });

  it('falls back to the raw value below the smallest standard scale', () => {
    expect(pickDrawingScale(0.005)).toBe(0.005);
  });

  it('guards degenerate input', () => {
    expect(pickDrawingScale(0)).toBe(1);
    expect(pickDrawingScale(Number.NaN)).toBe(1);
  });

  it('labels both magnification and reduction', () => {
    expect(scaleLabel(2)).toBe('2:1');
    expect(scaleLabel(1)).toBe('1:1');
    expect(scaleLabel(0.2)).toBe('1:5');
  });
});

describe('viewBoxOfPolylines', () => {
  it('returns the bbox across groups and null for empty input', () => {
    const box = viewBoxOfPolylines([
      [[[0, 0], [10, 0]]],
      [[[-2, 3], [4, 8]]],
    ]);
    expect(box).toEqual({ x: -2, y: 0, w: 12, h: 8 });
    expect(viewBoxOfPolylines([[], []])).toBeNull();
  });
});

describe('computeSheetLayout', () => {
  // Model 40 (w) × 30 (d) × 20 (h): front 40×20, top 40×30, left 30×20.
  const views: Record<'front' | 'top' | 'left' | 'iso', ViewBox2> = {
    front: { x: 0, y: 0, w: 40, h: 20 },
    top: { x: 0, y: 0, w: 40, h: 30 },
    left: { x: -30, y: 0, w: 30, h: 20 },
    iso: { x: -10, y: -5, w: 50, h: 45 },
  };

  it('picks a standard scale and aligns shared axes across views', () => {
    const layout = computeSheetLayout(views, SHEETS.a4);
    expect([100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01])
      .toContain(layout.scale);
    // Projection alignment: front/top share the x mapping, front/left the y.
    expect(layout.views.top.tx).toBeCloseTo(layout.views.front.tx, 9);
    expect(layout.views.left.ty).toBeCloseTo(layout.views.front.ty, 9);
  });

  it('keeps every placed view inside the sheet frame', () => {
    const layout = computeSheetLayout(views, SHEETS.a4);
    const sheet = SHEETS.a4;
    for (const name of ['front', 'top', 'left', 'iso'] as const) {
      const b = layout.views[name].box;
      expect(b.x).toBeGreaterThanOrEqual(sheet.margin - 1e-9);
      expect(b.y).toBeGreaterThanOrEqual(sheet.margin - 1e-9);
      expect(b.x + b.w).toBeLessThanOrEqual(sheet.w - sheet.margin + 1e-9);
      expect(b.y + b.h).toBeLessThanOrEqual(sheet.h - sheet.margin + 1e-9);
    }
  });

  it('places the top view above the front view and the left view left of it', () => {
    const layout = computeSheetLayout(views, SHEETS.a4);
    const { front, top, left } = layout.views;
    expect(top.box.y + top.box.h).toBeLessThanOrEqual(front.box.y);
    expect(left.box.x + left.box.w).toBeLessThanOrEqual(front.box.x);
  });
});

describe('dimensionToSvg', () => {
  it('renders extension lines, arrowheads, and the centered label', () => {
    const svg = dimensionToSvg({
      kind: 'horizontal',
      from: [10, 50],
      to: [60, 50],
      linePos: 58,
      label: '40',
    });
    expect(svg).toContain('class="dim"');
    expect(svg).toContain('>40</text>');
    // Two filled arrowheads.
    expect(svg.match(/fill="#000" stroke="none"\/>/g)?.length).toBe(2);
    // Three construction lines: two extension + one dimension line.
    expect(svg.match(/<line /g)?.length).toBe(3);
  });

  it('rotates the label for vertical dimensions', () => {
    const svg = dimensionToSvg({
      kind: 'vertical',
      from: [60, 10],
      to: [60, 40],
      linePos: 68,
      label: '30',
    });
    expect(svg).toContain('rotate(-90');
    expect(svg).toContain('>30</text>');
  });
});

describe('formatDimValue', () => {
  it('trims to at most two decimals', () => {
    expect(formatDimValue(40)).toBe('40');
    expect(formatDimValue(12.3456)).toBe('12.35');
    expect(formatDimValue(0.1)).toBe('0.1');
  });
});
