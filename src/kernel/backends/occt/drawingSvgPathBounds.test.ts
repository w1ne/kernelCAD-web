// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { measureSvgPath, nodeMatrix, transformPoint } from './drawingSvgPathBounds';

describe('SVG path bounds aligned with the vector PDF geometry parser', () => {
  it('measures cubic and quadratic endpoints outside the drawing sheet', () => {
    expect(measureSvgPath('M 20 20 C 80 30 340 45 350 50')?.x1).toBe(350);
    expect(measureSvgPath('M 20 10 Q 180 40 340 20')?.x1).toBe(340);
  });

  it('measures an arc and relative line segments', () => {
    const arc = measureSvgPath('M 10 100 A 50 50 0 0 1 110 100');
    expect(arc?.x1).toBeCloseTo(110, 4);
    expect(measureSvgPath('m 10 10 h 50 v 30 l -10 10')?.x1).toBeCloseTo(60, 5);
  });

  it('uses true Bézier extrema, not distant control points', () => {
    const bounds = measureSvgPath('M 20 100 C 90 350 190 -150 270 100')!;
    expect(bounds.y0).toBeGreaterThan(0);
    expect(bounds.y1).toBeLessThan(210);
  });

  it('applies ancestor and local transforms with the SVG/PDF composition order', () => {
    const root = { attrs: { transform: 'translate(240 0)' } };
    const child = { attrs: { transform: 'scale(1 2)' }, parent: root };
    const matrix = nodeMatrix(child);
    expect(transformPoint(20, 30, matrix)).toEqual([260, 60]);
    expect(measureSvgPath('M 20 20 L 90 80', matrix)?.x1).toBe(330);
  });

  it('does not silently accept unknown or incomplete commands', () => {
    expect(measureSvgPath('M 20 20 R 30 30')).toBeUndefined();
    expect(measureSvgPath('M 20 20 C 30 30')).toBeUndefined();
    expect(measureSvgPath('M 0 0 Z 10 10')).toBeUndefined();
    expect(measureSvgPath('M 0 0 L 10')).toBeUndefined();
    expect(measureSvgPath('M 0 0 C 10 10 20 20 30')).toBeUndefined();
    expect(measureSvgPath('M 0 0 A 5 5 0 0 1 10')).toBeUndefined();
    expect(measureSvgPath('M 0 0 Z M 10 10 L 20 20')?.x1).toBe(20);

  });
});
