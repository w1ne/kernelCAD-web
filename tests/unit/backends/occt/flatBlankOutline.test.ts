// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Flat-pattern outer outline: arc segments in the blank profile.
//
// `Region` wires are polylines, so `flattenPattern` samples curved sketch
// segments. These tests drive the real PathBuilder and check the recovered
// polyline against the analytic circle / rounded rectangle it came from, plus
// the refusal of segment kinds that have no exact polyline form.

import { describe, it, expect } from 'vitest';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { flattenPattern } from '../../../../src/kernel/backends/occt/flattenPattern';
import { ARC_CHORD_TOL_MM } from '../../../../src/kernel/backends/occt/flatBlankOutline';
import type { Vec2 } from '../../../../src/shared/intent/region';

async function flatOutline(profileBody: string): Promise<Vec2[]> {
  const { records } = await runScript({
    code: `
      const profile = path()${profileBody};
      return sheetMetal(profile, { thickness: 2, kFactor: 0.38 });
    `,
    fileName: 'flat-outline-arcs.kcad.ts',
  });
  return flattenPattern(records).outer;
}

function polygonArea(poly: readonly Vec2[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    area += x0 * y1 - x1 * y0;
  }
  return area / 2;
}

/** Distance from `p` to the outline of a w × h rectangle with corner radius r,
 *  lower-left corner at the origin. */
function distanceToRoundedRect(p: Vec2, w: number, h: number, r: number): number {
  const dx = Math.max(Math.abs(p[0] - w / 2) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(p[1] - h / 2) - (h / 2 - r), 0);
  return Math.abs(Math.hypot(dx, dy) - r);
}

const expectOnCircle = (points: readonly Vec2[], centre: Vec2, radius: number): void => {
  for (const [x, y] of points) {
    expect(Math.hypot(x - centre[0], y - centre[1])).toBeCloseTo(radius, 9);
  }
};

describe('flat-pattern outline — arc segments', () => {
  it('samples radiusArc to the authored circle (semicircle blank)', async () => {
    // Positive radius bulges left of the start→end chord, so this is the upper
    // semicircle; the closing line makes the authored loop clockwise.
    const outline = await flatOutline('.moveTo(-5, 0).radiusArc(5, 0, 5).lineTo(-5, 0).close()');
    expectOnCircle(outline, [0, 0], 5);
    expect(outline.every(([, y]) => y >= -1e-9)).toBe(true);
    expect(polygonArea(outline)).toBeCloseTo(-(Math.PI * 25) / 2, 1);
  });

  it('samples sagittaArc and bulgeArc to the same semicircle', async () => {
    const bySagitta = await flatOutline('.moveTo(-5, 0).sagittaArc(5, 0, 5).lineTo(-5, 0).close()');
    const byBulge = await flatOutline('.moveTo(-5, 0).bulgeArc(5, 0, 1).lineTo(-5, 0).close()');
    expectOnCircle(bySagitta, [0, 0], 5);
    expectOnCircle(byBulge, [0, 0], 5);
    expect(bySagitta.every(([, y]) => y >= -1e-9)).toBe(true);
    expect(polygonArea(bySagitta)).toBeCloseTo(polygonArea(byBulge), 9);
  });

  it('samples threePointsArc through its interior point', async () => {
    const outline = await flatOutline('.moveTo(-5, 0).threePointsArc(5, 0, 0, 5).lineTo(-5, 0).close()');
    expectOnCircle(outline, [0, 0], 5);
    expect(outline.every(([, y]) => y >= -1e-9)).toBe(true);
    expect(polygonArea(outline)).toBeCloseTo(-(Math.PI * 25) / 2, 1);
  });

  it('samples tangentArc from the previous segment tangent', async () => {
    // Line ending at (0, 5) along +X, then a quarter arc to (5, 0) on the
    // circle x² + y² = 25.
    const outline = await flatOutline('.moveTo(-5, 5).lineTo(0, 5).tangentArc(5, 0).close()');
    // The two line endpoints and every arc point lie on the circle.
    expectOnCircle(outline.slice(1), [0, 0], 5);
    expect(outline).toContainEqual([-5, 5]);
    expect(outline).toContainEqual([5, 0]);
    // Travel is clockwise about the origin (from 90° to 0°).
    const arcY = outline.filter(([x, y]) => x > 0 && y > 0);
    expect(arcY.length).toBeGreaterThan(0);
  });

  it('recovers an exact circle blank (two threePointsArc halves)', async () => {
    const { records } = await runScript({
      code: `return sheetMetal(path().circle(50, 30, 20), { thickness: 1.5, kFactor: 0.4 });`,
      fileName: 'flat-outline-circle.kcad.ts',
    });
    const outline = flattenPattern(records).outer;
    expect(outline.length).toBeGreaterThan(48);
    expectOnCircle(outline, [50, 30], 20);
    expect(polygonArea(outline)).toBeCloseTo(Math.PI * 400, 0);
  });

  it('recovers a rounded-corner blank within the chord tolerance and area', async () => {
    const outline = await flatOutline(
      '.moveTo(10, 0).lineTo(90, 0)'
      + '.tangentArc(100, 10).lineTo(100, 50)'
      + '.tangentArc(90, 60).lineTo(10, 60)'
      + '.tangentArc(0, 50).lineTo(0, 10)'
      + '.tangentArc(10, 0).close()',
    );
    for (const [index, p] of outline.entries()) {
      expect(distanceToRoundedRect(p, 100, 60, 10)).toBeLessThanOrEqual(1e-9);
      const q = outline[(index + 1) % outline.length];
      // Chords cut inside the arc; the midpoint carries the sampled sagitta.
      expect(distanceToRoundedRect([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], 100, 60, 10))
        .toBeLessThanOrEqual(ARC_CHORD_TOL_MM + 1e-9);
    }
    const xs = outline.map((p) => p[0]);
    const ys = outline.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(0, 6);
    expect(Math.max(...xs)).toBeCloseTo(100, 6);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(60, 6);
    const exactArea = 100 * 60 - (4 - Math.PI) * 10 * 10;
    expect(polygonArea(outline)).toBeCloseTo(exactArea, 0);
    // CCW: the authored profile order is preserved.
    expect(polygonArea(outline)).toBeGreaterThan(0);
  });

  it('treats a zero sagitta arc as a straight segment', async () => {
    const outline = await flatOutline('.moveTo(0, 0).sagittaArc(20, 0, 0).lineTo(20, 20).lineTo(0, 20).close()');
    expect(outline).toEqual([[0, 0], [20, 0], [20, 20], [0, 20]]);
  });

  it('rejects ellipse and spline segments by name instead of straightening them', async () => {
    await expect(flatOutline('.ellipse(50, 30, 20, 10)')).rejects.toThrow(
      /unsupported sketch segment "nurbsSegment"/,
    );
    await expect(
      flatOutline('.moveTo(0, 0).lineTo(20, 0).smoothSpline(20, 20).lineTo(0, 20).close()'),
    ).rejects.toThrow(/unsupported sketch segment "smoothSpline"/);
  });

  it('rejects a radiusArc whose radius cannot span its chord', async () => {
    await expect(flatOutline('.moveTo(0, 0).radiusArc(10, 0, 2).close()')).rejects.toThrow(
      /radiusArc cannot be recovered/,
    );
  });
});
