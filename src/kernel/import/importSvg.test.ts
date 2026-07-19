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

  it('<rect> with unequal rx/ry is refused, because the corners are elliptical', () => {
    expect(() => importSvgText(svg('<rect x="0" y="0" width="40" height="20" rx="5" ry="2"/>')))
      .toThrowError(/corners are elliptical/);
  });

  it('<circle> becomes two exact semicircular arcs', () => {
    const r = importSvgText(svg('<circle cx="50" cy="50" r="20"/>', 'width="100mm" viewBox="0 0 100 100"'));
    expect(r.regions[0].commands.map(c => c.kind)).toEqual(['moveTo', 'bulgeArc', 'bulgeArc', 'close']);
    expect(r.regions[0].areaMm2).toBeCloseTo(Math.PI * 400, 9);
  });

  it('<ellipse> is chord-approximated within curveTolerance', () => {
    const exact = Math.PI * 20 * 10;
    const coarse = importSvgText(
      svg('<ellipse cx="50" cy="50" rx="20" ry="10"/>', 'width="100mm" viewBox="0 0 100 100"'),
      { curveTolerance: 0.5 },
    );
    const fine = importSvgText(
      svg('<ellipse cx="50" cy="50" rx="20" ry="10"/>', 'width="100mm" viewBox="0 0 100 100"'),
      { curveTolerance: 0.001 },
    );
    // An inscribed polygon always under-reports, and refining must close the gap.
    expect(coarse.regions[0].areaMm2).toBeLessThan(exact);
    expect(fine.regions[0].segmentCount).toBeGreaterThan(coarse.regions[0].segmentCount);
    expect(fine.regions[0].areaMm2).toBeCloseTo(exact, 1);
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

  it('flattens arcs when a non-uniform transform makes them elliptical', () => {
    const r = importSvgText(svg(
      '<g transform="scale(2,1)"><circle cx="20" cy="20" r="10"/></g>',
      'width="100mm" viewBox="0 0 100 100"',
    ));
    // No exact arc survives — an ellipse has no bulge form — and the area is
    // that of the transformed ellipse, not the original circle.
    expect(r.regions[0].commands.some(c => c.kind === 'bulgeArc')).toBe(false);
    // Chord sampling was sized in the circle's own frame and then stretched
    // 2x in X, so the inscribed polygon is a little under the true ellipse.
    const exact = Math.PI * 20 * 10;
    expect(r.regions[0].areaMm2).toBeLessThan(exact);
    expect(r.regions[0].areaMm2).toBeGreaterThan(exact * 0.998);
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

  it('flattens C/S/Q/T Béziers within curveTolerance', () => {
    // The cubic is the standard 4/3·(√2−1) approximation of the quarter
    // circle of radius 10 centred on (0, 10), so the closed region is the
    // triangle (0,0)-(10,10)-(10,0) plus the circular segment cut off by the
    // chord: 50 + r²/2·(π/2 − 1). Refining the tolerance must converge on
    // that, not wander off it.
    const d = '<path d="M0 0 C 0 5.5228 4.4772 10 10 10 L 10 0 Z"/>';
    const exact = 50 + (100 / 2) * (Math.PI / 2 - 1);
    const coarse = importSvgText(svg(d), { curveTolerance: 0.5 });
    const fine = importSvgText(svg(d), { curveTolerance: 0.0005 });
    expect(fine.regions[0].segmentCount).toBeGreaterThan(coarse.regions[0].segmentCount);
    // Tolerance 1 decimal, not more: the residual ~0.02 mm² is the CUBIC's
    // own error against a true quarter circle (the 0.5523 handle constant is
    // itself an approximation), not the flattener's. Tightening
    // curveTolerance cannot remove it.
    expect(fine.regions[0].areaMm2).toBeCloseTo(exact, 1);
    expect(Math.abs(coarse.regions[0].areaMm2 - exact))
      .toBeGreaterThan(Math.abs(fine.regions[0].areaMm2 - exact));

    // S and T must reflect the previous control point, i.e. produce a curve
    // that is NOT the straight-line chord.
    const smooth = importSvgText(svg('<path d="M0 0 C 0 5 5 10 10 10 S 20 5 20 0 Z"/>'));
    expect(smooth.regions[0].segmentCount).toBeGreaterThan(4);
    const quadT = importSvgText(svg('<path d="M0 0 Q 5 10 10 10 T 20 0 Z"/>'));
    expect(quadT.regions[0].segmentCount).toBeGreaterThan(4);
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

  it('<use> is refused rather than resolved to nothing', () => {
    const e = failure(() => importSvgText(svg('<use href="#part"/>')));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toMatch(/^<use> at offset \d+:/);
  });

  it('an unrecognised element is refused, not skipped', () => {
    const e = failure(() => importSvgText(svg('<blob cx="1"/>')));
    expect(e.reason).toBe('unsupported-element');
    expect(e.message).toMatch(/^<blob> at offset \d+: unrecognised SVG element/);
  });

  it('an unsupported transform function names itself', () => {
    const e = failure(() => importSvgText(svg('<g transform="skewX(20)"><rect x="0" y="0" width="1" height="1"/></g>')));
    expect(e.message).toMatch(/transform function 'skewX\(\.\.\.\)' is not supported/);
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
