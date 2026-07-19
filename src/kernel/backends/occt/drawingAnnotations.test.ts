// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAnnotations.test.ts
//
// Tests for user-authored drawing annotations. Two layers:
//
//   - pure 2D: the radial / angular / leader renderers added to drawingLayout,
//     asserted on computed geometry (arrow tips, arc endpoints, label text)
//     rather than on SVG blobs.
//   - end-to-end through the real HLR exporter: anchoring correctness across
//     two different drawing scales, and the no-annotations byte-identity gate.

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  angularDimensionToSvg,
  leaderNoteToSvg,
  radialDimensionToSvg,
} from './drawingLayout';
import {
  modelToSheet,
  renderAnnotations,
  type DrawingAnnotation,
} from './drawingAnnotations';
import { projectPointForDrawing, viewBasis } from './drawingProjection';
import { initOcct, OcctBackend } from './occtBackend';
import { exportSvgDrawing } from './exportSvgDrawing';
import type { WorldFramePart } from './sceneToWorldFrame';

const decode = (b: Uint8Array): string => new TextDecoder().decode(b);

/** All numbers inside every `<line>`/`<path>`/`<text>` of one SVG fragment. */
function nums(svg: string): number[] {
  return (svg.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

// ---------------------------------------------------------------------------
// Pure 2D renderers
// ---------------------------------------------------------------------------

describe('radialDimensionToSvg', () => {
  it('puts the arrow tip exactly on the rim and the leader outside it', () => {
    // Leader straight right (angle 0) from a circle of sheet-radius 10.
    const svg = radialDimensionToSvg({
      kind: 'radius',
      center: [100, 50],
      radius: 10,
      angle: 0,
      label: 'R20',
    });
    // Measuring line runs centre -> elbow (rim + 7 mm stem).
    expect(svg).toContain('x1="100" y1="50" x2="117" y2="50"');
    // Shoulder: 5 mm further right.
    expect(svg).toContain('x1="117" y1="50" x2="122" y2="50"');
    // Arrowhead is a filled triangle whose tip is the rim point (110, 50).
    expect(svg).toContain('M 110 50');
    expect(svg).toContain('fill="#000" stroke="none"');
    expect(svg).toContain('>R20</text>');
    // Exactly one arrowhead for a radius.
    expect((svg.match(/fill="#000" stroke="none"\/>/g) ?? []).length).toBe(1);
  });

  it('spans the full diameter with two arrowheads', () => {
    const svg = radialDimensionToSvg({
      kind: 'diameter',
      center: [100, 50],
      radius: 10,
      angle: 0,
      label: '⌀20',
    });
    // Line starts at the FAR rim (90, 50), not the centre.
    expect(svg).toContain('x1="90" y1="50" x2="117" y2="50"');
    expect((svg.match(/fill="#000" stroke="none"\/>/g) ?? []).length).toBe(2);
    expect(svg).toContain('>⌀20</text>');
  });

  it('flips the shoulder left when the leader points left', () => {
    const right = radialDimensionToSvg({
      kind: 'radius', center: [100, 50], radius: 10, angle: 0, label: 'R20',
    });
    const left = radialDimensionToSvg({
      kind: 'radius', center: [100, 50], radius: 10, angle: Math.PI, label: 'R20',
    });
    expect(right).toContain('text-anchor="end"');
    expect(left).toContain('text-anchor="start"');
    // Shoulder ends 22 mm to the right vs 22 mm to the left of the centre.
    expect(right).toContain('x2="122"');
    expect(left).toContain('x2="78"');
  });
});

describe('angularDimensionToSvg', () => {
  it('draws the arc between the two directions with the measured label', () => {
    // 90° corner: one leg along +x, one along -y (sheet up).
    const svg = angularDimensionToSvg({
      apex: [100, 100],
      startAngle: 0,
      endAngle: Math.PI / 2,
      radius: 12,
      label: '90°',
    });
    // Arc endpoints: apex + 12·(cos, sin).
    expect(svg).toContain('M 112 100 A 12 12 0 0 1 100 112');
    // Both extension lines start at the apex and overshoot the arc by 2.5 mm.
    expect(svg).toContain('x1="100" y1="100" x2="114.5" y2="100"');
    expect(svg).toContain('>90°</text>');
    expect((svg.match(/fill="#000" stroke="none"\/>/g) ?? []).length).toBe(2);
  });

  it('flips the SVG sweep flag for a negative sweep', () => {
    const neg = angularDimensionToSvg({
      apex: [0, 0], startAngle: 0, endAngle: -Math.PI / 2, radius: 10, label: '90°',
    });
    expect(neg).toMatch(/A 10 10 0 0 0/);
  });
});

describe('leaderNoteToSvg', () => {
  it('points the arrowhead back at the target and lands the text on a shoulder', () => {
    const svg = leaderNoteToSvg({ target: [50, 50], angle: 0, text: 'DEBURR' });
    expect(svg).toContain('x1="50" y1="50" x2="57" y2="50"');
    expect(svg).toContain('x1="57" y1="50" x2="62" y2="50"');
    // Arrow tip at the target; its base is 2.6 mm AWAY from the leader
    // direction, i.e. at x = 52.6 — the head points into the target.
    expect(svg).toContain('M 50 50 L 52.6');
    expect(svg).toContain('>DEBURR</text>');
    expect(svg).toContain('class="dim note"');
  });
});

// ---------------------------------------------------------------------------
// Projection basis
// ---------------------------------------------------------------------------

describe('viewBasis / projectPointForDrawing', () => {
  it('matches the documented camera axes', () => {
    // Compared component-wise: a cross product legitimately yields −0 for a
    // zero component, which `toEqual` treats as distinct from +0.
    const axes = (v: 'front' | 'top' | 'left') => {
      const b = viewBasis(v);
      return [...b.x, ...b.y].map(n => n + 0);
    };
    expect(axes('front')).toEqual([1, 0, 0, 0, 0, 1].map(n => expect.closeTo(n, 12)));
    expect(axes('top')).toEqual([1, 0, 0, 0, 1, 0].map(n => expect.closeTo(n, 12)));
    expect(axes('left')).toEqual([0, -1, 0, 0, 0, 1].map(n => expect.closeTo(n, 12)));
  });

  it('drops the depth axis of each view', () => {
    // Front view looks along −y, so the model's y coordinate must not appear.
    expect(projectPointForDrawing([3, 99, 7], 'front')).toEqual([3, 7]);
    expect(projectPointForDrawing([3, 4, 99], 'top')).toEqual([3, 4]);
    expect(projectPointForDrawing([99, 4, 7], 'left')).toEqual([-4, 7]);
  });
});

describe('modelToSheet', () => {
  it('applies the same affine map bakePath uses for geometry', () => {
    const placement = { tx: 20, ty: 100, box: { x: 20, y: 60, w: 40, h: 40 } };
    // front: model (10, ·, 5) -> model2D (10, 5) -> sheet (20+20, 100−10)
    expect(modelToSheet([10, 0, 5], 'front', placement, 2)).toEqual([40, 90]);
  });
});

// ---------------------------------------------------------------------------
// Stacking
// ---------------------------------------------------------------------------

describe('renderAnnotations stacking', () => {
  const placements = {
    front: { tx: 0, ty: 100, box: { x: 0, y: 60, w: 40, h: 40 } },
    top: { tx: 0, ty: 40, box: { x: 0, y: 0, w: 40, h: 40 } },
    left: { tx: 0, ty: 100, box: { x: 0, y: 60, w: 40, h: 40 } },
    iso: { tx: 0, ty: 40, box: { x: 60, y: 0, w: 40, h: 40 } },
  };

  it('steps each further bottom dimension out by DIM_STEP in author order', () => {
    const anns: DrawingAnnotation[] = [
      { kind: 'linear', from: [0, 0, 0], to: [20, 0, 0] },
      { kind: 'linear', from: [0, 0, 0], to: [40, 0, 0] },
    ];
    const r = renderAnnotations({ parts: [], annotations: anns, placements, scale: 1 });
    // Front box bottom is y=100 → dimension lines at 108 then 116.
    expect(r.svg[0]).toContain('y1="108" x2="20" y2="108"');
    expect(r.svg[1]).toContain('y1="116" x2="40" y2="116"');
    expect(r.bottomReserve.front).toBe(16);
    // Labels are true model distances, unaffected by the stack position.
    expect(r.svg[0]).toContain('>20</text>');
    expect(r.svg[1]).toContain('>40</text>');
  });

  it('buckets vertical dimensions to the right of the view, independently', () => {
    const anns: DrawingAnnotation[] = [
      { kind: 'linear', from: [0, 0, 0], to: [30, 0, 0] },  // horizontal
      { kind: 'linear', from: [0, 0, 0], to: [0, 0, 30] },  // vertical
    ];
    const r = renderAnnotations({ parts: [], annotations: anns, placements, scale: 1 });
    expect(r.svg[0]).toContain('y2="108"');       // bottom bucket, index 0
    expect(r.svg[1]).toContain('x1="48" y1="100" x2="48" y2="70"'); // right, index 0
    expect(r.bottomReserve.front).toBe(8);
  });

  it('rotates successive leaders so two callouts never coincide', () => {
    const anns: DrawingAnnotation[] = [
      { kind: 'note', at: [10, 0, 10], text: 'A' },
      { kind: 'note', at: [10, 0, 10], text: 'B' },
    ];
    const r = renderAnnotations({ parts: [], annotations: anns, placements, scale: 1 });
    const a = nums(r.svg[0]);
    const b = nums(r.svg[1]);
    expect(a).not.toEqual(b);
    // Same target, different elbow — the leaders diverge by 30°.
    expect(r.svg[0]).toContain('x1="10" y1="90"');
    expect(r.svg[1]).toContain('x1="10" y1="90"');
  });

  it('honours `offset` as extra sheet-mm on top of the automatic placement', () => {
    const r = renderAnnotations({
      parts: [],
      annotations: [{ kind: 'linear', from: [0, 0, 0], to: [20, 0, 0], offset: 5 }],
      placements,
      scale: 1,
    });
    expect(r.svg[0]).toContain('y2="113"');
    expect(r.bottomReserve.front).toBe(13);
  });

  it('names the annotation and the reason when a view does not exist', () => {
    expect(() =>
      renderAnnotations({
        parts: [],
        annotations: [
          { kind: 'note', at: [0, 0, 0], text: 'x', view: 'rear' as never },
        ],
        placements,
        scale: 1,
      }),
    ).toThrow(/annotations\[0\] \(note, view 'rear'\): unknown view/);
  });

  it('escapes author-supplied text', () => {
    const r = renderAnnotations({
      parts: [],
      annotations: [{ kind: 'note', at: [0, 0, 0], text: '<b>&</b>' }],
      placements,
      scale: 1,
    });
    expect(r.svg[0]).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
  });
});

// ---------------------------------------------------------------------------
// End-to-end through the real exporter
// ---------------------------------------------------------------------------

describe('exportSvgDrawing annotations', () => {
  beforeAll(async () => {
    await initOcct();
  });

  const plate = (): WorldFramePart[] => [{
    name: 'plate',
    shape: OcctBackend.box(60, 40, 10)
      .subtract(OcctBackend.cylinder(12, 6).translate(30, 20, -1)),
  }];

  it('leaves the sheet byte-identical to the pre-annotations exporter', () => {
    // The fixture was rendered by the exporter as it stood BEFORE annotations
    // existed (regenerate with `git show <pre-change-sha>:…/exportSvgDrawing.ts`).
    // Comparing today's no-annotation output against a self-generated baseline
    // would only prove the exporter agrees with itself — this compares it
    // against the shipped behaviour it must not change.
    const golden = readFileSync(
      new URL('../../../../tests/fixtures/drawings/plate-no-annotations.svg', import.meta.url),
      'utf8',
    );
    const opts = { format: 'svg-drawing' as const, modelName: 'plate' };
    expect(decode(exportSvgDrawing(plate(), opts))).toBe(golden);
    // An explicitly empty array must take the same path as an absent one.
    expect(decode(exportSvgDrawing(plate(), { ...opts, annotations: [] }))).toBe(golden);
    // Sanity: the golden really does carry the three bbox dimensions.
    expect((golden.match(/class="dim"/g) ?? []).length).toBe(3);
    expect(golden).toContain('>60</text>');
    expect(golden).toContain('>40</text>');
    expect(golden).toContain('>10</text>');
  });

  it('replaces the bbox dimensions with the authored ones', () => {
    const svg = decode(exportSvgDrawing(plate(), {
      format: 'svg-drawing',
      annotations: [
        { kind: 'linear', from: [0, 0, 0], to: [60, 0, 0] },
        { kind: 'note', at: [0, 0, 10], text: 'BREAK EDGES' },
      ],
    }));
    expect((svg.match(/class="dim"/g) ?? []).length).toBe(1); // the linear one
    expect(svg).toContain('class="dim note"');
    expect(svg).toContain('>60</text>');
    expect(svg).toContain('>BREAK EDGES</text>');
    // The height/depth bbox dims are gone.
    expect(svg).not.toContain('>40</text>');
  });

  it('renders diameter and radius callouts off a circular edge query', () => {
    const svg = decode(exportSvgDrawing(plate(), {
      format: 'svg-drawing',
      annotations: [
        { kind: 'diameter', view: 'top', edge: { ofCurveType: 'CIRCLE', atZ: 10 } },
        { kind: 'radius', view: 'top', edge: { ofCurveType: 'CIRCLE', atZ: 10 } },
      ],
    }));
    // ⌀12 hole → radius 6.
    expect(svg).toContain('>⌀12</text>');
    expect(svg).toContain('>R6</text>');
  });

  it('measures the true included angle between two edges', () => {
    // Two perpendicular edges of a box's front face meet at the origin, so
    // the projected included angle must come out at exactly 90 degrees.
    const svg = decode(exportSvgDrawing([{ name: 'b', shape: OcctBackend.box(40, 20, 30) }], {
      format: 'svg-drawing',
      annotations: [{
        kind: 'angular',
        view: 'front',
        // bottom-front edge (along +X) and the left-front edge (along +Z).
        from: { ofCurveType: 'LINE', within: { xMin: 1, xMax: 39, yMin: -0.5, yMax: 0.5, zMin: -0.5, zMax: 0.5 } },
        to: { ofCurveType: 'LINE', within: { xMin: -0.5, xMax: 0.5, yMin: -0.5, yMax: 0.5, zMin: 1, zMax: 29 } },
      }],
    }));
    expect(svg).toContain('>90\u00b0</text>');
    expect(svg).toMatch(/A 12 12 0 0 [01]/);
  });

  it('refuses an angular dimension between parallel edges', () => {
    expect(() =>
      exportSvgDrawing([{ name: 'b', shape: OcctBackend.box(40, 20, 30) }], {
        format: 'svg-drawing',
        annotations: [{
          kind: 'angular',
          view: 'front',
          from: { ofCurveType: 'LINE', within: { xMin: 1, xMax: 39, yMin: -0.5, yMax: 0.5, zMin: -0.5, zMax: 0.5 } },
          to: { ofCurveType: 'LINE', within: { xMin: 1, xMax: 39, yMin: -0.5, yMax: 0.5, zMin: 29.5, zMax: 30.5 } },
        }],
      }),
    ).toThrow(/parallel in view 'front'/);
  });

  it('throws naming the annotation when its geometry cannot be resolved', () => {
    expect(() =>
      exportSvgDrawing(plate(), {
        format: 'svg-drawing',
        annotations: [{ kind: 'radius', edge: { atZ: 9999 } }],
      }),
    ).toThrow(/annotations\[0\] \(radius\): no edge matched/);
  });

  it('rejects a radius on a non-circular edge instead of approximating one', () => {
    expect(() =>
      exportSvgDrawing(plate(), {
        format: 'svg-drawing',
        annotations: [{
          kind: 'radius',
          edge: { ofCurveType: 'LINE', near: [0, 0, 0], within: { zMin: -0.5, zMax: 0.5, yMin: -0.5, yMax: 0.5 } },
        }],
      }),
    ).toThrow(/not a CIRCLE/);
  });

  it('reports every failure at once rather than the first', () => {
    expect(() =>
      exportSvgDrawing(plate(), {
        format: 'svg-drawing',
        annotations: [
          { kind: 'radius', edge: { atZ: 9001 } },
          { kind: 'note', at: { face: { atZ: 9002 } }, text: 'x' },
        ],
      }),
    ).toThrow(/2 annotation\(s\) could not be resolved[\s\S]*annotations\[0\][\s\S]*annotations\[1\]/);
  });

  // -- scale invariance ----------------------------------------------------

  /** Pull the font-size and the arrow-triangle leg lengths out of a sheet. */
  function textAndArrowMetrics(svg: string): { fontSizes: number[]; arrowLegs: number[] } {
    const fontSizes = [...svg.matchAll(/<text[^>]*font-size="([\d.]+)"/g)]
      .map(m => Number(m[1]));
    const arrowLegs = [...svg.matchAll(
      /<path d="M (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+) Z" fill="#000"/g,
    )].map(m => {
      const [, x0, y0, x1, y1] = m.map(Number);
      return Math.round(Math.hypot(x1 - x0, y1 - y0) * 1000) / 1000;
    });
    return { fontSizes, arrowLegs };
  }

  it('keeps text and leader sizes constant in sheet mm across two drawing scales', () => {
    const anns: DrawingAnnotation[] = [
      { kind: 'note', at: [0, 0, 0], text: 'DATUM A' },
    ];
    const small = { name: 's', shape: OcctBackend.box(20, 20, 20) };
    const big = { name: 'b', shape: OcctBackend.box(400, 300, 200) };
    const svgSmall = decode(exportSvgDrawing([small], { format: 'svg-drawing', annotations: anns }));
    const svgBig = decode(exportSvgDrawing([big], { format: 'svg-drawing', annotations: anns }));

    const scaleOf = (s: string) => s.match(/data-kc-scale="([^"]+)"/)![1];
    // Gate the gate: if both sheets picked the same scale this proves nothing.
    expect(scaleOf(svgSmall)).not.toBe(scaleOf(svgBig));

    const a = textAndArrowMetrics(svgSmall);
    const b = textAndArrowMetrics(svgBig);
    expect(a.fontSizes).toEqual(b.fontSizes);
    // Arrow legs are compared with a 0.01 mm tolerance: the SVG writer rounds
    // to 3 decimals, so the same 2.638 mm leg can print differently once the
    // anchor position (which DOES scale) shifts the rounding.
    expect(a.arrowLegs).toHaveLength(b.arrowLegs.length);
    a.arrowLegs.forEach((leg, i) => expect(leg).toBeCloseTo(b.arrowLegs[i], 2));
  });

  it('anchors a hole callout on the hole through the model->sheet transform', () => {
    // Same plate 1x and 5x. The hole is dead-centre of the top view in both,
    // so the callout's reconstructed circle centre must land on the view's
    // horizontal centreline (== the view label's x) at BOTH drawing scales,
    // and its sheet radius must be the model radius times that scale. Neither
    // holds if the annotation is anchored anywhere but model space.
    const mk = (k: number): WorldFramePart[] => [{
      name: 'p',
      shape: OcctBackend.box(60 * k, 40 * k, 10 * k)
        .subtract(OcctBackend.cylinder(12 * k, 6 * k).translate(30 * k, 20 * k, -k)),
    }];
    const render = (k: number) => decode(exportSvgDrawing(mk(k), {
      format: 'svg-drawing',
      annotations: [{ kind: 'diameter', view: 'top', edge: { ofCurveType: 'CIRCLE', atZ: 10 * k } }],
    }));

    const parseScale = (svg: string): number => {
      const [a, b] = svg.match(/data-kc-scale="([^"]+)"/)![1].split(':').map(Number);
      return a / b;
    };
    /** Rebuild the circle from the emitted diameter line: it runs far-rim ->
     *  elbow, i.e. length 2r + LEADER_STEM(7), starting at the far rim. */
    const circleFromCallout = (svg: string) => {
      const m = svg.match(/<g class="dim"[^>]*><line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/)!;
      const [x1, y1, x2, y2] = m.slice(1).map(Number);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const r = (len - 7) / 2;
      return { r, cx: x1 + ((x2 - x1) / len) * r, cy: y1 + ((y2 - y1) / len) * r };
    };
    const labelX = (svg: string): number =>
      Number(svg.match(/<g id="view-top"[\s\S]*?<text class="view-label" x="([\d.]+)"/)![1]);

    const s1 = render(1);
    const s5 = render(5);
    // Gate the gate: a shared scale would make this prove nothing.
    expect(parseScale(s1)).not.toBe(parseScale(s5));

    for (const [svg, k] of [[s1, 1], [s5, 5]] as const) {
      const c = circleFromCallout(svg);
      expect(c.cx).toBeCloseTo(labelX(svg), 1);
      expect(c.r).toBeCloseTo(6 * k * parseScale(svg), 1);
    }
    // Labels state MODEL millimetres either way.
    expect(s1).toContain('>\u230012</text>');
    expect(s5).toContain('>\u230060</text>');
  });

  it('is byte-deterministic with annotations', () => {
    const mk = () => decode(exportSvgDrawing(plate(), {
      format: 'svg-drawing',
      annotations: [
        { kind: 'linear', from: [0, 0, 0], to: [60, 0, 0] },
        { kind: 'diameter', view: 'top', edge: { ofCurveType: 'CIRCLE', atZ: 10 } },
      ],
    }));
    expect(mk()).toBe(mk());
  });
});
