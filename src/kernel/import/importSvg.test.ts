// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importSvg.test.ts
//
// Parser-level tests for `importSvgText`, with inline SVG fixtures.
//
// The Y-flip block is the important one. SVG's Y axis points down and
// kernelCAD's points up, and a symmetric fixture passes whether or not the
// reflection happens — so every flip assertion here uses a deliberately
// ASYMMETRIC shape and checks WHERE the mass ended up, not just its extent.

import { describe, it, expect } from 'vitest';
import { importSvgText, SvgParseError } from './importSvg';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

type Nurbs = Extract<SketchCommand, { kind: 'nurbsSegment' }>;

function nurbsOf(commands: readonly SketchCommand[]): Nurbs[] {
  return commands.filter((c): c is Nurbs => c.kind === 'nurbsSegment');
}

/** Poles rounded to 1e-9 so exact values compare cleanly. */
function poles(c: Nurbs): Array<[number, number]> {
  return c.controlPoints.map(p => [Math.round(p.x.evaluated * 1e9) / 1e9, Math.round(p.y.evaluated * 1e9) / 1e9]);
}

/** Curve point at u = 1/2 of a rational quadratic: (P0 + 2wP1 + P2) / (2 + 2w). */
function rationalMid(c: Nurbs): [number, number] {
  const [p0, p1, p2] = c.controlPoints.map(p => [p.x.evaluated, p.y.evaluated]);
  const w = c.weights?.[1].evaluated ?? 1;
  return [0, 1].map(i => (p0[i] + 2 * w * p1[i] + p2[i]) / (2 + 2 * w)) as [number, number];
}

/**
 * `areaMm2` integrates NURBS edges from samples (the B-rep stays exact), so
 * area checks on curved regions use a relative bound, not digits.
 */
function expectAreaNear(actual: number, exact: number): void {
  expect(Math.abs(actual - exact) / exact).toBeLessThan(1e-4);
}

function points(commands: readonly SketchCommand[]): Array<[number, number]> {
  return commands
    .filter((c): c is Extract<SketchCommand, { x: unknown; y: unknown }> => 'x' in c && 'y' in c)
    .map(c => [c.x.evaluated, c.y.evaluated]);
}

/**
 * Midpoint of every arc in the loop, rounded to 1e-9.
 *
 * The apex sits `bulge * halfChord` from the chord midpoint along the RIGHT
 * normal of travel (a positive bulge puts the CENTRE to the left, so the arc
 * bows right). Unlike the bulge number, this point does not move when the
 * loop is re-oriented, so it is a real read-out of which way the arc bows.
 */
function arcApexes(commands: readonly SketchCommand[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let prev: [number, number] | null = null;
  for (const c of commands) {
    if ('x' in c && 'y' in c) {
      const here: [number, number] = [c.x.evaluated, c.y.evaluated];
      if (c.kind === 'bulgeArc' && prev) {
        const dx = here[0] - prev[0];
        const dy = here[1] - prev[1];
        const chord = Math.hypot(dx, dy);
        const sagitta = c.bulge.evaluated * (chord / 2);
        const round = (v: number): number => Math.round(v * 1e9) / 1e9;
        out.push([
          round((prev[0] + here[0]) / 2 + (dy / chord) * sagitta),
          round((prev[1] + here[1]) / 2 + (-dx / chord) * sagitta),
        ]);
      }
      prev = here;
    }
  }
  return out;
}

function svg(body: string, attrs = 'width="100mm" height="40mm" viewBox="0 0 100 40"'): string {
  return `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
}

/**
 * An L: a wide bar along the SVG TOP (y = 0..10) and a narrow leg down the
 * left (x = 0..10). Nothing about it is symmetric in Y, so where the wide bar
 * lands after import is a direct read-out of whether the flip happened.
 */
const L_SHAPE = '<polygon points="0,0 100,0 100,10 10,10 10,40 0,40"/>';

describe('importSvgText — the Y axis is flipped', () => {
  it('puts the SVG-top wide bar at HIGH Y, and would put it at LOW Y unflipped', () => {
    const r = importSvgText(svg(L_SHAPE));
    const pts = points(r.regions[0].commands);

    // The two far-right vertices are the wide bar. In the SVG they sit at
    // y = 0 and y = 10 — the TOP. kernelCAD's Y points up, so after the flip
    // they must sit at the TOP of the imported range: y = 40 and y = 30.
    // Without the flip they would be 0 and 10.
    const rightYs = pts.filter(p => Math.abs(p[0] - 100) < 1e-9).map(p => p[1]).sort((a, b) => a - b);
    expect(rightYs).toEqual([30, 40]);

    // And the leg's foot, at SVG y = 40 (the bottom), must land on y = 0.
    const legYs = pts.filter(p => Math.abs(p[0] - 10) < 1e-9).map(p => p[1]).sort((a, b) => a - b);
    expect(legYs).toEqual([0, 30]);

    // Whole-shape sanity: area is flip-invariant, so it is NOT the test above.
    expect(r.regions[0].areaMm2).toBeCloseTo(100 * 10 + 10 * 30, 9);
    expect(r.flippedAboutViewBox).toBe(true);
  });

  it('reflects about viewBox minY too, so a shifted viewBox still lands at Y >= 0', () => {
    const r = importSvgText(svg(
      '<polygon points="0,100 60,100 60,110 0,130"/>',
      'width="60mm" viewBox="0 100 60 30"',
    ));
    const ys = points(r.regions[0].commands).map(p => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(0, 9);
    expect(Math.max(...ys)).toBeCloseTo(30, 9);
    // SVG y=100 (top of the viewBox) is the flat edge; it must end up at Y=30.
    const topEdgeXs = new Set(
      points(r.regions[0].commands).filter(p => Math.abs(p[1] - 30) < 1e-9).map(p => p[0]),
    );
    expect([...topEdgeXs].sort((a, b) => a - b)).toEqual([0, 60]);
  });

  it('reverses arc handedness with the reflection, not just endpoints', () => {
    // A half-disc whose flat edge is the chord and whose bulge points at SVG
    // +y (downwards on screen). After the flip the bulge must point at
    // kernelCAD -Y. If the flip were applied to endpoints only, the arc would
    // bow the wrong way and the enclosed area would be the complement.
    const r = importSvgText(svg(
      '<path d="M 10 20 A 10 10 0 0 0 30 20 Z"/>',
      'width="40mm" viewBox="0 0 40 40"',
    ));
    const arc = r.regions[0].commands.find(c => c.kind === 'bulgeArc');
    expect(arc).toBeDefined();
    // Area alone would NOT catch a handedness bug — it is the same on either
    // side of the chord. The bulge SIGN is the thing that changes.
    expect(r.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 2, 9);

    // The bulge VALUE alone is no good either: loops are normalised to CCW,
    // and reversing a loop negates every bulge along with the travel
    // direction, so an unflipped arc comes back with the same number. The
    // apex — an actual point on the arc — is the invariant that moves.
    expect(arcApexes(r.regions[0].commands)).toEqual([[20, 10]]);

    const ys = points(r.regions[0].commands).map(p => p[1]);
    expect(Math.max(...ys)).toBeCloseTo(20, 9);
  });

  it('falls back to plain negation when there is no viewBox and no height', () => {
    const r = importSvgText(svg(L_SHAPE, 'width="100"'));
    expect(r.flippedAboutViewBox).toBe(false);
    const ys = points(r.regions[0].commands).map(p => p[1]);
    // Still upside-right in shape, just anchored at Y <= 0.
    expect(Math.max(...ys)).toBeCloseTo(0, 9);
    expect(Math.min(...ys)).toBeLessThan(0);
  });
});

describe('importSvgText — elements', () => {
  it('<rect> with equal rx/ry keeps circular corners exact', () => {
    const r = importSvgText(svg('<rect x="10" y="10" width="40" height="20" rx="5"/>',
      'width="100mm" viewBox="0 0 100 100"'));
    expect(r.regions[0].commands.filter(c => c.kind === 'bulgeArc')).toHaveLength(4);
    expect(r.regions[0].areaMm2).toBeCloseTo(40 * 20 - (4 - Math.PI) * 25, 9);
  });

  it('<rect> with unequal rx/ry keeps its elliptical corners exact', () => {
    const r = importSvgText(svg('<rect x="0" y="0" width="40" height="20" rx="5" ry="2"/>'));
    const corners = nurbsOf(r.regions[0].commands);
    expect(corners).toHaveLength(4);
    expect(r.regions[0].segmentCount).toBe(8);
    expectAreaNear(r.regions[0].areaMm2, 40 * 20 - (4 - Math.PI) * 5 * 2);
    // Each corner passes through its quarter-ellipse midpoint exactly.
    for (const q of corners) {
      const [x, y] = rationalMid(q);
      const cx = x < 20 ? 5 : 35;
      const cy = y < 30 ? 22 : 38;
      expect(((x - cx) / 5) ** 2 + ((y - cy) / 2) ** 2).toBeCloseTo(1, 12);
    }
  });

  it('<circle> becomes two exact semicircular arcs', () => {
    const r = importSvgText(svg('<circle cx="50" cy="50" r="20"/>', 'width="100mm" viewBox="0 0 100 100"'));
    expect(r.regions[0].commands.map(c => c.kind)).toEqual(['moveTo', 'bulgeArc', 'bulgeArc', 'close']);
    expect(r.regions[0].areaMm2).toBeCloseTo(Math.PI * 400, 9);
  });

  it('<ellipse> becomes four exact rational quarter arcs, whatever curveTolerance says', () => {
    const el = svg('<ellipse cx="50" cy="50" rx="20" ry="10"/>', 'width="100mm" viewBox="0 0 100 100"');
    const coarse = importSvgText(el, { curveTolerance: 0.5 });
    const fine = importSvgText(el, { curveTolerance: 0.0005 });
    expect(fine.regions[0].commands).toEqual(coarse.regions[0].commands);
    const quarters = nurbsOf(coarse.regions[0].commands);
    expect(coarse.regions[0].segmentCount).toBe(4);
    expect(quarters).toHaveLength(4);
    for (const q of quarters) {
      expect(q.degree.evaluated).toBe(2);
      expect(q.weights?.map(w => w.evaluated)).toEqual([1, expect.closeTo(Math.SQRT1_2, 12), 1]);
    }
    // The first quarter runs from (70, 50) through the box corner (70, 40)
    // to (50, 40) in SVG — (70, 50), (70, 60), (50, 60) after the Y flip.
    expect(poles(quarters[0]).map(p => p.join(','))).toEqual(['70,50', '70,60', '50,60']);
    expectAreaNear(coarse.regions[0].areaMm2, Math.PI * 200);
  });

  it('<polygon> closes itself; <polyline> and <line> chain with each other', () => {
    const closedR = importSvgText(svg('<polygon points="0,0 20,0 20,10 0,10"/>'));
    expect(closedR.regions[0].areaMm2).toBeCloseTo(200, 9);

    const chained = importSvgText(svg(
      '<polyline points="0,0 20,0 20,10"/><line x1="20" y1="10" x2="0" y2="10"/>' +
      '<line x1="0" y1="10" x2="0" y2="0"/>',
    ));
    expect(chained.regions).toHaveLength(1);
    expect(chained.regions[0].areaMm2).toBeCloseTo(200, 9);
  });

  it('applies nested <g> transforms', () => {
    const r = importSvgText(svg(
      '<g transform="translate(10,10)"><g transform="scale(2)">' +
      '<rect x="0" y="0" width="10" height="5"/></g></g>' +
      '<rect x="0" y="0" width="4" height="4"/>',
      'width="100mm" viewBox="0 0 100 100"',
    ));
    expect(r.regions.map(x => x.areaMm2)).toEqual([200, 16]);
    // translate(10,10) then scale(2): the rect spans SVG x 10..30.
    const xs = points(r.regions[0].commands).map(p => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(10, 9);
    expect(Math.max(...xs)).toBeCloseTo(30, 9);
  });

  it('keeps a circle exact as a rational ellipse under a non-uniform or sheared transform', () => {
    const stretched = importSvgText(svg(
      '<g transform="scale(2,1)"><circle cx="20" cy="20" r="10"/></g>',
      'width="100mm" viewBox="0 0 100 100"',
    ));
    // No bulge survives — an ellipse has no bulge form — but the curve is
    // the exact image of the circle, not chords.
    const cmds = stretched.regions[0].commands;
    expect(cmds.some(c => c.kind === 'bulgeArc' || c.kind === 'lineTo')).toBe(false);
    expect(nurbsOf(cmds)).toHaveLength(4);
    expectAreaNear(stretched.regions[0].areaMm2, Math.PI * 20 * 10);
    for (const q of nurbsOf(cmds)) {
      const [x, y] = rationalMid(q);
      expect(((x - 40) / 20) ** 2 + ((y - 80) / 10) ** 2).toBeCloseTo(1, 12);
    }

    // A shear keeps the conjugate diameters, not the axes, so the area is
    // still pi r^2 times the determinant.
    const sheared = importSvgText(svg(
      '<g transform="matrix(1 0 0.5 1 0 0)"><circle cx="20" cy="20" r="10"/></g>',
      'width="100mm" viewBox="0 0 100 100"',
    ));
    expect(nurbsOf(sheared.regions[0].commands)).toHaveLength(4);
    expectAreaNear(sheared.regions[0].areaMm2, Math.PI * 100);
  });

  it('skips non-rendering subtrees and reports them', () => {
    const r = importSvgText(svg(
      '<title>ignore me</title><defs><rect x="0" y="0" width="90" height="30"/></defs>' +
      '<polygon points="0,0 20,0 20,10 0,10"/>',
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(200, 9);
    expect(r.ignoredElements.map(s => s.slice(0, 7))).toEqual(['<title>', '<defs> ']);
  });
});

describe('importSvgText — skewX / skewY transforms', () => {
  it('a skewX rect becomes the sheared parallelogram, flipped into Y-up', () => {
    const r = importSvgText(svg(
      '<g transform="translate(15 15) skewX(45)"><rect x="-5" y="-5" width="10" height="10"/></g>',
      'width="40mm" height="30mm" viewBox="0 0 40 30"',
    ));
    const pts = points(r.regions[0].commands).map(p => p.map(v => Math.round(v * 1e9) / 1e9).join(','));
    // SVG corners (10,10) (20,10) (20,20) (10,20) shear by x += y - 15 to
    // (5,10) (15,10) (25,20) (15,20); the flip y -> 30 - y puts the SVG top
    // edge at Y = 20, so the top edge leans LEFT of the bottom edge.
    expect(new Set(pts)).toEqual(new Set(['5,20', '15,20', '25,10', '15,10']));
    expect(r.regions[0].areaMm2).toBeCloseTo(100, 9);
  });

  it('a skewY circle becomes an exact oblique ellipse with the circle area', () => {
    const r = importSvgText(svg(
      '<circle cx="0" cy="0" r="6" transform="translate(20 15) skewY(-20)"/>',
      'width="40mm" height="30mm" viewBox="0 0 40 30"',
    ));
    const arcs = nurbsOf(r.regions[0].commands);
    expect(arcs).toHaveLength(4);
    // Each quarter's u = 1/2 point lies on the sheared circle: undo the flip
    // and the shear, and it is 6 mm from the centre.
    const t = Math.tan((20 * Math.PI) / 180);
    for (const arc of arcs) {
      const [x, Y] = rationalMid(arc);
      const lx = x - 20;
      const ly = 30 - Y - 15 + t * lx;
      expect(Math.hypot(lx, ly)).toBeCloseTo(6, 9);
    }
    expectAreaNear(r.regions[0].areaMm2, 36 * Math.PI);
  });
});

describe('importSvgText — <use> references', () => {
  function extent(commands: readonly SketchCommand[]): [number, number, number, number] {
    const pts = points(commands);
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(v => Math.round(v * 1e9) / 1e9) as
      [number, number, number, number];
  }

  it('draws a <defs> target under the use transform, then translate(x, y)', () => {
    const r = importSvgText(svg(
      '<defs><rect id="r" x="0" y="0" width="10" height="5"/></defs>' +
      '<use href="#r" x="20" y="10" transform="scale(2)"/>',
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(200, 9);
    // scale(2) applies AFTER translate(20, 10): SVG x 40..60, y 20..30,
    // which is Y 10..20 after the flip about 40. The reverse order would
    // land at x 20..40.
    expect(extent(r.regions[0].commands)).toEqual([40, 10, 60, 20]);
  });

  it('applies the target transform but not its ancestors, and draws the original too', () => {
    const r = importSvgText(svg(
      '<g transform="translate(50 0)"><rect id="r" transform="translate(5 0)" x="0" y="0" width="10" height="5"/></g>' +
      '<use xlink:href="#r" y="20"/>',
    ));
    expect(r.regions.map(x => extent(x.commands))).toEqual([[55, 35, 65, 40], [5, 15, 15, 20]]);
  });

  it('expands a <g>, a viewBox-free <symbol> and a <use> of a <use>', () => {
    const r = importSvgText(svg(
      '<defs><circle id="c" r="2"/><use id="u" href="#c" x="10"/>' +
      '<g id="pair" transform="translate(0 5)"><use href="#c"/><use href="#c" x="6"/></g>' +
      '<symbol id="s"><rect width="4" height="3"/></symbol></defs>' +
      '<use href="#u" y="20"/><use href="#pair" x="30" y="10"/><use href="#s" x="60" y="30"/>',
    ));
    // A circle's commands hold only its two arc ends, (cx ± r, cy), so
    // compare the centres of each extent.
    const centres = r.regions.map(x => {
      const [x0, y0, x1, y1] = extent(x.commands);
      return [(x0 + x1) / 2, (y0 + y1) / 2];
    });
    expect(r.regions.map(x => x.areaMm2)).toEqual([
      expect.closeTo(Math.PI * 4, 9), expect.closeTo(Math.PI * 4, 9), expect.closeTo(Math.PI * 4, 9),
      expect.closeTo(12, 9),
    ]);
    // #u -> (10, 20); #pair -> (30, 15) and (36, 15); #s -> 60..64 x 30..33,
    // all reflected about Y = 40.
    expect(centres).toEqual(expect.arrayContaining([[10, 20], [30, 25], [36, 25], [62, 8.5]]));
    expect(centres).toHaveLength(4);
  });

  it('maps a <symbol> viewBox into the <use> viewport with the default xMidYMid meet', () => {
    // viewBox 0 0 20 4 into 30 x 12: scale min(1.5, 3) = 1.5, so the 20 x 4
    // rect is 30 x 6, centred in the 12-tall viewport at SVG y 11..17 (Y 23..29
    // after the flip about 40).
    const r = importSvgText(svg(
      '<defs><symbol id="s" viewBox="0 0 20 4"><rect width="20" height="4"/></symbol></defs>' +
      '<use href="#s" x="30" y="8" width="30" height="12"/>',
    ));
    expect(r.regions.map(x => x.areaMm2)).toEqual([expect.closeTo(180, 9)]);
    expect(extent(r.regions[0].commands)).toEqual([30, 23, 60, 29]);
  });

  it('honours the symbol viewBox origin and its preserveAspectRatio alignment', () => {
    // viewBox -10 -10 20 20 into a 40 x 10 viewport: scale 0.5. xMinYMid
    // puts the 10 x 10 box at the left; xMaxYMid at the right. The square's
    // corner (-10, -10) maps to the viewport corner, so (0, 0) .. (10, 10)
    // covers SVG x 5..10 then 30+5..30+10.
    const r = importSvgText(svg(
      '<defs><symbol id="a" viewBox="-10 -10 20 20" preserveAspectRatio="xMinYMid meet">' +
      '<rect width="10" height="10"/></symbol>' +
      '<symbol id="b" viewBox="-10 -10 20 20" preserveAspectRatio="xMaxYMid"><rect width="10" height="10"/></symbol></defs>' +
      '<use href="#a" width="40" height="10"/><use href="#b" y="20" width="40" height="10"/>',
    ));
    expect(r.regions.map(x => extent(x.commands))).toEqual(expect.arrayContaining([
      [5, 30, 10, 35], [35, 10, 40, 15],
    ]));
    expect(r.regions).toHaveLength(2);
  });

  it('stretches each axis independently under preserveAspectRatio="none"', () => {
    // Right triangle with its right angle at the SVG top-left, so the
    // orientation is visible: viewBox 0 0 4 10 into 8 x 15 is scale 2 x 1.5.
    const r = importSvgText(svg(
      '<defs><symbol id="v" viewBox="0 0 4 10" preserveAspectRatio="none">' +
      '<polygon points="0,0 4,0 0,10"/></symbol></defs><use href="#v" x="40" y="22" width="8" height="15"/>',
    ));
    expect(r.regions[0].areaMm2).toBeCloseTo(60, 9);
    expect(points(r.regions[0].commands)).toEqual(expect.arrayContaining([[40, 18], [48, 18], [40, 3]]));
  });

  it('takes the viewport size from the <symbol> when the <use> omits it, and the <use> size wins', () => {
    const r = importSvgText(svg(
      '<defs><symbol id="s" viewBox="0 0 1 1" width="4" height="4"><rect width="1" height="1"/></symbol></defs>' +
      '<use href="#s"/><use href="#s" x="20" width="8" height="8"/>',
    ));
    expect(r.regions.map(x => x.areaMm2)).toEqual([expect.closeTo(64, 9), expect.closeTo(16, 9)]);
  });

  it('applies the <use> transform outside the symbol viewport, and nests symbol uses', () => {
    // The inner symbol scales its 4 x 4 rect x0.5 and the outer one x2, so
    // it is 4 x 4 in the <use> space; x=10 then scale(2) puts it at SVG
    // x 20..28, y 0..8 (Y 32..40 after the flip).
    const r = importSvgText(svg(
      '<defs><symbol id="inner" viewBox="0 0 4 4"><rect width="4" height="4"/></symbol>' +
      '<symbol id="outer" viewBox="0 0 5 5"><use href="#inner" width="2" height="2"/></symbol></defs>' +
      '<use href="#outer" transform="scale(2)" x="10" width="10" height="10"/>',
    ));
    expect(r.regions[0].areaMm2).toBeCloseTo(64, 9);
    expect(extent(r.regions[0].commands)).toEqual([20, 32, 28, 40]);
  });
});

describe('importSvgText — path data', () => {
  it('handles relative commands, H/V, and implicit repeats', () => {
    const abs = importSvgText(svg('<path d="M 0 0 L 20 0 L 20 10 L 0 10 Z"/>'));
    const rel = importSvgText(svg('<path d="m 0 0 l 20 0 l 0 10 l -20 0 z"/>'));
    const hv = importSvgText(svg('<path d="M0 0 H20 V10 H0 Z"/>'));
    const implicit = importSvgText(svg('<path d="M0 0 20 0 20 10 0 10 Z"/>'));
    for (const r of [abs, rel, hv, implicit]) {
      expect(r.regions).toHaveLength(1);
      expect(r.regions[0].areaMm2).toBeCloseTo(200, 9);
    }
  });

  it('handles multiple Z-closed subpaths in one <path>', () => {
    const r = importSvgText(svg(
      '<path d="M0 0 H20 V10 H0 Z M40 0 h10 v10 h-10 z"/>',
      'width="100mm" viewBox="0 0 100 100"',
    ));
    expect(r.regions.map(x => x.areaMm2)).toEqual([200, 100]);
  });

  it('reads arc flags that are run together with the following number', () => {
    // `a10 10 0 011 0` is large-arc=0, sweep=1, dx=1, dy=0 — the compressed
    // form real exporters emit. A regex tokenizer reads `011` as 11 and
    // silently produces a different arc.
    const packed = importSvgText(svg('<path d="M10 20a10 10 0 0120 0z"/>',
      'width="40mm" viewBox="0 0 40 40"'));
    const spaced = importSvgText(svg('<path d="M10 20 a 10 10 0 0 1 20 0 z"/>',
      'width="40mm" viewBox="0 0 40 40"'));
    expect(packed.regions[0].areaMm2).toBeCloseTo(spaced.regions[0].areaMm2, 9);
    expect(packed.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 2, 9);
  });

  it('honours the large-arc flag', () => {
    const minor = importSvgText(svg('<path d="M10 20 A 10 10 0 0 1 30 20 Z"/>',
      'width="40mm" viewBox="0 0 40 40"'));
    const major = importSvgText(svg('<path d="M10 20 A 10 10 0 1 1 30 20 Z"/>',
      'width="40mm" viewBox="0 0 40 40"'));
    expect(minor.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 2, 9);
    expect(major.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 2, 9);
    // Same area for a semicircle either way — but opposite sides of the
    // chord, which the Y extents show.
    const minorYs = points(minor.regions[0].commands).map(p => p[1]);
    const majorYs = points(major.regions[0].commands).map(p => p[1]);
    expect(Math.max(...minorYs)).toBeCloseTo(20, 9);
    expect(Math.max(...majorYs)).toBeCloseTo(20, 9);
    expect(minor.regions[0].commands.filter(c => c.kind === 'bulgeArc')).toHaveLength(1);
  });

  it('keeps a non-circular, rotated A arc exact and lands on its endpoint', () => {
    // Half of a 20 x 10 ellipse whose major axis is turned 30 degrees.
    const r = importSvgText(svg(
      '<path d="M 0 0 A 20 10 30 0 1 34.64101615137755 20 Z"/>',
      'width="100mm" viewBox="0 0 100 100"',
    ), { curveTolerance: 0.5 });
    const curves = nurbsOf(r.regions[0].commands);
    expect(curves).toHaveLength(2);
    expect(r.regions[0].segmentCount).toBe(3);
    expectAreaNear(r.regions[0].areaMm2, (Math.PI * 200) / 2);
    // The arc ends on the exact pen position the file named (either end of
    // a curve, because assembly may reverse the loop to run CCW).
    const ends = curves.flatMap(c => [c.controlPoints[0], c.controlPoints[2]])
      .map(p => `${p.x.evaluated},${p.y.evaluated}`);
    expect(ends).toContain('34.64101615137755,80');
  });

  it('keeps C/S/Q/T Béziers exact as NURBS segments, whatever curveTolerance says', () => {
    // One cubic and one closing line: two segments at any tolerance, and the
    // cubic's poles are the SVG control points after the Y flip (y -> 40 - y).
    const d = '<path d="M0 0 C 0 5.5228 4.4772 10 10 10 L 10 0 Z"/>';
    const coarse = importSvgText(svg(d), { curveTolerance: 0.5 });
    const fine = importSvgText(svg(d), { curveTolerance: 0.0005 });
    expect(coarse.regions[0].segmentCount).toBe(3);
    expect(fine.regions[0].commands).toEqual(coarse.regions[0].commands);
    const [cubic] = nurbsOf(coarse.regions[0].commands);
    expect(cubic.degree.evaluated).toBe(3);
    expect(cubic.knots?.map(k => k.evaluated)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    expect(cubic.weights).toBeUndefined();
    expect(new Set(poles(cubic).map(p => p.join(',')))).toEqual(
      new Set([[0, 40], [0, 34.4772], [4.4772, 30], [10, 30]].map(p => p.join(','))),
    );

    // S reflects the previous cubic control point through the pen:
    // (5, 10) about (10, 10) is (15, 10).
    const smooth = importSvgText(svg('<path d="M0 0 C 0 5 5 10 10 10 S 20 5 20 0 Z"/>'));
    const smoothCurves = nurbsOf(smooth.regions[0].commands);
    expect(smoothCurves).toHaveLength(2);
    expect(smoothCurves.flatMap(poles).map(p => p.join(','))).toContain('15,30');

    // Q is kept as an exact quadratic; T reflects its control: (5, 10)
    // about (10, 10) is (15, 10).
    const quadT = importSvgText(svg('<path d="M0 0 Q 5 10 10 10 T 20 0 Z"/>'));
    const quads = nurbsOf(quadT.regions[0].commands);
    expect(quads).toHaveLength(2);
    expect(quads.every(q => q.degree.evaluated === 2 && q.controlPoints.length === 3)).toBe(true);
    expect(quads.flatMap(poles).map(p => p.join(','))).toContain('15,30');
  });

  it('keeps a Bézier exact under a non-uniform transform', () => {
    // An affine map sends a Bézier to the Bézier of the mapped poles, so a
    // stretched group still imports as one cubic, not chords.
    const r = importSvgText(svg('<g transform="scale(2 0.5)"><path d="M0 0 C 0 10 10 10 10 0 Z"/></g>'));
    const curves = r.regions[0].commands.filter(c => c.kind === 'nurbsSegment');
    expect(curves).toHaveLength(1);
    expect(r.regions[0].segmentCount).toBe(2);
  });

  it('drops a Bézier whose poles all coincide instead of emitting a zero-length curve', () => {
    const r = importSvgText(svg('<path d="M0 0 C 0 0 0 0 0 0 L 10 0 L 10 10 Z"/>'));
    expect(r.regions[0].commands.some(c => c.kind === 'nurbsSegment')).toBe(false);
    expect(r.regions[0].areaMm2).toBeCloseTo(50, 9);
  });
});

describe('importSvgText — units', () => {
  it('derives scale from a physical width over the viewBox width', () => {
    const r = importSvgText(svg('<polygon points="0,0 20,0 20,10 0,10"/>',
      'width="200mm" viewBox="0 0 100 40"'));
    expect(r.unitScale).toBeCloseTo(2, 12);
    expect(r.unitSource).toBe("width='200mm' over viewBox width 100");
    expect(r.regions[0].areaMm2).toBeCloseTo(200 * 4, 9);
  });

  it('handles an inch width', () => {
    const r = importSvgText(svg('<polygon points="0,0 10,0 10,10 0,10"/>',
      'width="1in" viewBox="0 0 10 10"'));
    expect(r.unitScale).toBeCloseTo(2.54, 12);
  });

  it('reads a unitless width and height as CSS pixels over the viewBox', () => {
    // 192 unitless = 192 px = 50.8 mm. The same file with "192px" already
    // scaled this way; the unitless form must not fall back to 1 unit = 1 px.
    const r = importSvgText(svg('<rect x="0" y="0" width="96" height="96"/>',
      'width="192" height="192" viewBox="0 0 96 96"'));
    expect(r.unitScale).toBeCloseTo(2 * 25.4 / 96, 12);
    expect(r.unitSource).toBe("width='192' and height='192' over viewBox 96 x 96, xMidYMid meet");
    expect(r.regions[0].areaMm2).toBeCloseTo(50.8 * 50.8, 6);
  });

  it('scales a unitless width with no height from the width', () => {
    const r = importSvgText(svg('<rect x="0" y="0" width="96" height="96"/>',
      'width="192" viewBox="0 0 96 96"'));
    expect(r.unitScale).toBeCloseTo(2 * 25.4 / 96, 12);
    expect(r.unitSource).toBe("width='192' over viewBox width 96");
    expect(r.regions[0].areaMm2).toBeCloseTo(50.8 * 50.8, 6);
  });

  it('letterboxes a unitless viewport whose aspect differs from the viewBox', () => {
    // 192 x 96 px = 50.8 x 25.4 mm holding a square viewBox. The meet scale
    // is 25.4 / 96 mm per unit and the square is centred in X.
    const r = importSvgText(svg('<rect x="0" y="0" width="96" height="96"/>',
      'width="192" height="96" viewBox="0 0 96 96"'));
    const pts = points(r.regions[0].commands);
    expect(Math.min(...pts.map(p => p[0]))).toBeCloseTo(12.7, 9);
    expect(Math.max(...pts.map(p => p[0]))).toBeCloseTo(38.1, 9);
    expect(Math.min(...pts.map(p => p[1]))).toBeCloseTo(0, 9);
    expect(Math.max(...pts.map(p => p[1]))).toBeCloseTo(25.4, 9);
  });

  it('ignores a percentage height and keeps a unitless width scale', () => {
    const r = importSvgText(svg('<rect x="0" y="0" width="96" height="96"/>',
      'width="192" height="50%" viewBox="0 0 96 96"'));
    expect(r.unitScale).toBeCloseTo(2 * 25.4 / 96, 12);
    expect(r.unitSource).toBe("width='192' over viewBox width 96");
  });

  it('letterboxes a mismatched viewport with the default xMidYMid meet', () => {
    // A 200 x 100 mm viewport holds a square viewBox: the default meet scale
    // is 1 mm per unit (height-limited), and the square is centred in X.
    const r = importSvgText(svg('<rect x="0" y="0" width="100" height="100"/>',
      'width="200mm" height="100mm" viewBox="0 0 100 100"'));
    expect(r.unitScale).toBeCloseTo(1, 12);
    expect(r.unitSource).toBe("width='200mm' and height='100mm' over viewBox 100 x 100, xMidYMid meet");
    const pts = points(r.regions[0].commands);
    expect(Math.min(...pts.map(p => p[0]))).toBeCloseTo(50, 9);
    expect(Math.max(...pts.map(p => p[0]))).toBeCloseTo(150, 9);
    expect(Math.min(...pts.map(p => p[1]))).toBeCloseTo(0, 9);
    expect(Math.max(...pts.map(p => p[1]))).toBeCloseTo(100, 9);
    expect(r.regions[0].areaMm2).toBeCloseTo(10_000, 6);
  });

  it('honours preserveAspectRatio="none" with a non-uniform axis scale', () => {
    const r = importSvgText(svg('<rect x="0" y="0" width="100" height="100"/>',
      'width="200mm" height="100mm" viewBox="0 0 100 100" preserveAspectRatio="none"'));
    expect(r.unitScale).toBeCloseTo(2, 12);
    expect(r.unitSource).toBe("width='200mm' and height='100mm' over viewBox 100 x 100, preserveAspectRatio='none' (non-uniform)");
    const pts = points(r.regions[0].commands);
    expect(Math.min(...pts.map(p => p[0]))).toBeCloseTo(0, 9);
    expect(Math.max(...pts.map(p => p[0]))).toBeCloseTo(200, 9);
    expect(Math.min(...pts.map(p => p[1]))).toBeCloseTo(0, 9);
    expect(Math.max(...pts.map(p => p[1]))).toBeCloseTo(100, 9);
    expect(r.regions[0].areaMm2).toBeCloseTo(20_000, 6);
  });

  it('honours an explicit xMaxYMax meet alignment', () => {
    const r = importSvgText(svg('<rect x="0" y="0" width="100" height="100"/>',
      'width="200mm" height="100mm" viewBox="0 0 100 100" preserveAspectRatio="xMaxYMax meet"'));
    const pts = points(r.regions[0].commands);
    expect(Math.min(...pts.map(p => p[0]))).toBeCloseTo(100, 9);
    expect(Math.max(...pts.map(p => p[0]))).toBeCloseTo(200, 9);
    expect(Math.min(...pts.map(p => p[1]))).toBeCloseTo(0, 9);
    expect(Math.max(...pts.map(p => p[1]))).toBeCloseTo(100, 9);
  });

  it('scales by the larger axis for slice without clipping the profile', () => {
    // slice uses max(200/100, 100/100) = 2 mm per unit. The importer keeps
    // geometry that falls outside the viewport; it does not clip profiles.
    const r = importSvgText(svg('<rect x="0" y="0" width="100" height="100"/>',
      'width="200mm" height="100mm" viewBox="0 0 100 100" preserveAspectRatio="xMinYMin slice"'));
    expect(r.unitScale).toBeCloseTo(2, 12);
    expect(r.unitSource).toBe("width='200mm' and height='100mm' over viewBox 100 x 100, xMinYMin slice");
    const pts = points(r.regions[0].commands);
    expect(Math.min(...pts.map(p => p[0]))).toBeCloseTo(0, 9);
    expect(Math.max(...pts.map(p => p[0]))).toBeCloseTo(200, 9);
    expect(Math.min(...pts.map(p => p[1]))).toBeCloseTo(-100, 9);
    expect(Math.max(...pts.map(p => p[1]))).toBeCloseTo(100, 9);
    expect(r.regions[0].areaMm2).toBeCloseTo(40_000, 6);
  });

  it('assumes 1 user unit = 1 CSS px when no physical width is given', () => {
    const r = importSvgText(svg('<polygon points="0,0 96,0 96,96 0,96"/>',
      'viewBox="0 0 96 96"'));
    expect(r.unitScale).toBeCloseTo(25.4 / 96, 12);
    expect(r.unitSource).toMatch(/assumed 1 user unit = 1 CSS px/);
    expect(r.regions[0].areaMm2).toBeCloseTo(25.4 * 25.4, 6);
  });

  it('opts.units overrides everything the file declares', () => {
    const r = importSvgText(
      svg('<polygon points="0,0 10,0 10,10 0,10"/>', 'width="500mm" viewBox="0 0 10 10"'),
      { units: 'mm' },
    );
    expect(r.unitSource).toBe('opts.units=mm');
    expect(r.regions[0].areaMm2).toBeCloseTo(100, 9);
  });

  it('ignores a non-positive height and keeps the width-only scale', () => {
    const r = importSvgText(svg('<rect x="0" y="0" width="100" height="100"/>',
      'width="200mm" height="-100mm" viewBox="0 0 100 100"'));
    expect(r.unitScale).toBeCloseTo(2, 12);
    expect(r.unitSource).toBe("width='200mm' over viewBox width 100");
  });

  it('refuses a percentage width, which has no absolute size', () => {
    expect(() => importSvgText(svg('<polygon points="0,0 10,0 10,10 0,10"/>',
      'width="100%" viewBox="0 0 10 10"')))
      .toThrowError(/percentage length .* has no absolute size outside a viewport/);
  });
});

describe('importSvgText — failure paths name what went wrong', () => {
  function failure(fn: () => unknown): SvgParseError {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(SvgParseError);
      return e as SvgParseError;
    }
    throw new Error('expected importSvgText to throw');
  }

  it('empty file', () => {
    const e = failure(() => importSvgText('\n \t'));
    expect(e.reason).toBe('empty');
    expect(e.message).toBe('SVG payload is empty.');
  });

  it('not an SVG', () => {
    const e = failure(() => importSvgText('<html><body>hi</body></html>'));
    expect(e.reason).toBe('not-svg');
    expect(e.message).toMatch(/no <svg> root element/);
  });

  it('<text> is refused, with the tool action that fixes it', () => {
    const e = failure(() => importSvgText(svg('<text x="0" y="0">PART A</text>')));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toMatch(/^<text> at offset \d+:/);
    expect(e.message).toMatch(/silently incomplete/);
    expect(e.message).toMatch(/Object to Path/);
  });

  it('a <use> of a missing id is refused rather than resolved to nothing', () => {
    const e = failure(() => importSvgText(svg('<use href="#part"/>')));
    expect(e.reason).toBe('malformed-attribute');
    expect(e.message).toMatch(/^<use> at offset \d+: references '#part', but no element in the document has id='part'\.$/);
  });

  it('a <use> pointing at another file is refused', () => {
    const e = failure(() => importSvgText(svg('<use xlink:href="parts.svg#hole"/>')));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toMatch(/href='parts\.svg#hole' points outside this document/);
  });

  it('a circular <use> chain names the loop', () => {
    const e = failure(() => importSvgText(svg(
      '<defs><use id="a" href="#b"/><use id="b" href="#a"/></defs><use href="#a"/>',
    )));
    expect(e.message).toMatch(/circular reference #a -> #b -> #a\.$/);
    const self = failure(() => importSvgText(svg('<g id="g"><use href="#g"/></g>')));
    expect(self.message).toMatch(/circular reference #g -> #g\.$/);
  });

  it('a <use> of a viewBox <symbol> with no viewport size is refused, not sized by guess', () => {
    // The SVG default is 100% of the enclosing viewport, which a CAD import
    // cannot resolve to a length without guessing.
    const e = failure(() => importSvgText(svg(
      '<defs><symbol id="s" viewBox="0 0 1 1"><rect width="1" height="1"/></symbol></defs><use href="#s"/>',
    )));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toMatch(/^<symbol> at offset \d+ \(via <use> at offset \d+\): .*neither the <use> nor the <symbol> sets width/);
    const pct = failure(() => importSvgText(svg(
      '<defs><symbol id="s" viewBox="0 0 1 1"><rect width="1" height="1"/></symbol></defs>' +
      '<use href="#s" width="50%" height="10"/>',
    )));
    expect(pct.message).toMatch(/width='50%'/);
  });

  it('a viewBox <symbol> that would be clipped or offset is refused', () => {
    const slice = failure(() => importSvgText(svg(
      '<defs><symbol id="s" viewBox="0 0 1 2" preserveAspectRatio="xMidYMid slice"><rect width="1" height="2"/></symbol></defs>' +
      '<use href="#s" width="10" height="10"/>',
    )));
    expect(slice.reason).toBe('unsupported-element');
    expect(slice.message).toMatch(/slice/);
    const offset = failure(() => importSvgText(svg(
      '<defs><symbol id="s" viewBox="0 0 1 1" refX="0.5"><rect width="1" height="1"/></symbol></defs>' +
      '<use href="#s" width="10" height="10"/>',
    )));
    expect(offset.message).toMatch(/refX/);
  });

  it('a <use> of a nested <svg> is still refused', () => {
    const e = failure(() => importSvgText(svg(
      '<defs><svg id="s" viewBox="0 0 1 1"><rect width="1" height="1"/></svg></defs><use href="#s" width="10" height="10"/>',
    )));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toMatch(/^<svg> at offset \d+ \(via <use> at offset \d+\): .*nested <svg>/);
  });

  it('an unrecognised element is refused, not skipped', () => {
    const e = failure(() => importSvgText(svg('<blob cx="1"/>')));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toMatch(/^<blob> at offset \d+: unrecognised SVG element/);
  });

  it('an unsupported transform function names itself', () => {
    const e = failure(() => importSvgText(svg('<g transform="perspective(20)"><rect x="0" y="0" width="1" height="1"/></g>')));
    expect(e.message).toMatch(/transform function 'perspective\(\.\.\.\)' is not supported/);
  });

  it('a bad path command names the character and its offset', () => {
    const e = failure(() => importSvgText(svg('<path d="M0 0 L10 0 X 5 5 Z"/>')));
    expect(e.reason).toBe('malformed-path');
    expect(e.message).toMatch(/expected a number at offset \d+, found 'X 5 5 Z'/);
  });

  it('path data that does not start with a moveto is refused', () => {
    const e = failure(() => importSvgText(svg('<path d="L10 0 L10 10 Z"/>')));
    expect(e.reason).toBe('malformed-path');
    expect(e.message).toMatch(/a drawing command appears before any 'M'/);
  });

  it('a missing d attribute is refused', () => {
    const e = failure(() => importSvgText(svg('<path/>')));
    expect(e.reason).toBe('malformed-path');
    expect(e.message).toMatch(/the 'd' attribute is missing or empty/);
  });

  it('a non-numeric attribute names the element and attribute', () => {
    const e = failure(() => importSvgText(svg('<circle cx="0" cy="0" r="big"/>')));
    expect(e.reason).toBe('malformed-attribute');
    expect(e.message).toMatch(/<circle> at offset \d+: attribute r='big' is not a number/);
  });

  it('an unclosed contour is reported, never auto-closed', () => {
    const e = failure(() => importSvgText(svg('<polyline points="0,0 20,0 20,10"/>')));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/open contour/);
    expect(e.message).toMatch(/dead-ends at/);
  });

  it('an SVG with no geometry at all fails rather than returning nothing', () => {
    const e = failure(() => importSvgText(svg('<title>empty drawing</title>')));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/no usable 2D geometry/);
  });
});
