// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto.test.ts
//
// Structural gate for `options.autoAnnotate` and declared GD&T: renders real
// parts through the exporter and asserts the exact callout strings, datum
// assignment, structured `data-kc-*` hooks and the placement report — never
// pixel positions.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { renderSvgDrawing } from './exportSvgDrawing';
import type { WorldFramePart } from './sceneToWorldFrame';

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/** 80×50×10 plate: four ⌀6.5 through-holes on a 60×30 pattern, a central
 *  ⌀5.5 hole counterbored ⌀10 × 3 from the top, and R5 vertical corners. */
function mountingPlate(): WorldFramePart[] {
  const filleted = replicad.makeBaseBox(80, 50, 10).fillet(5, e => e.inDirection('Z')).translate(40, 25, 0);
  let body = new OcctBackend(filleted as replicad.Shape3D);
  for (const [x, y] of [[10, 10], [70, 10], [10, 40], [70, 40]] as const) {
    body = body.subtract(OcctBackend.cylinder(14, 3.25).translate(x, y, -2));
  }
  body = body.subtract(OcctBackend.cylinder(14, 2.75).translate(40, 25, -2));
  body = body.subtract(OcctBackend.cylinder(4, 5).translate(40, 25, 7));
  return [{ name: 'plate', shape: body }];
}

/** Every `data-kc-auto` group of one kind, as whole markup strings. */
function autoGroups(svg: string, kind: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<g class="[^"]*" data-kc-auto="${kind}"`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    // Balance nested <g> to find the group's end.
    let depth = 0;
    let i = m.index;
    for (;;) {
      const open = svg.indexOf('<g', i + 1);
      const close = svg.indexOf('</g>', i + 1);
      if (open !== -1 && open < close) { depth++; i = open; continue; }
      if (depth === 0) { out.push(svg.slice(m.index, close + 4)); break; }
      depth--;
      i = close;
    }
  }
  return out;
}

describe('autoAnnotate on a counterbored mounting plate', () => {
  let svg = '';
  let result: ReturnType<typeof renderSvgDrawing>;

  beforeAll(async () => {
    await initOcct();
    result = renderSvgDrawing(mountingPlate(), { format: 'svg-drawing', modelName: 'plate', autoAnnotate: true });
    svg = decode(result.bytes);
  });

  it('establishes datums A (bottom), B (front) and C (left) and draws their symbols', () => {
    expect(result.report!.datums).toEqual([
      { label: 'A', source: 'auto', normal: [0, 0, -1], point: expect.any(Array) },
      { label: 'B', source: 'auto', normal: [0, -1, 0], point: expect.any(Array) },
      { label: 'C', source: 'auto', normal: [-1, 0, 0], point: expect.any(Array) },
    ]);
    expect(result.report!.datums[0].point[2]).toBe(0);
    expect(result.report!.datums[1].point[1]).toBe(0);
    expect(result.report!.datums[2].point[0]).toBe(0);
    for (const label of ['A', 'B', 'C']) {
      const groups = autoGroups(svg, 'datum').filter(g => g.includes(`data-kc-datum="${label}"`));
      expect(groups).toHaveLength(1);
      expect(groups[0]).toContain(`>${label}</text>`);
      expect(groups[0]).toContain('<rect');
    }
  });

  it('groups the four plain holes into one callout with a position frame to A B C', () => {
    const holes = autoGroups(svg, 'hole');
    expect(holes).toHaveLength(2);
    const pattern = holes.find(g => g.includes('>4× ⌀6.5 THRU</text>'));
    expect(pattern).toBeDefined();
    expect(pattern).toContain('data-kc-count="4"');
    expect(pattern).toContain('data-kc-fcf="⌖ ⌀0.1 A B C"');
    for (const cell of ['⌖', '⌀0.1', 'A', 'B', 'C']) expect(pattern).toContain(`>${cell}</text>`);
    const cbore = holes.find(g => g.includes('>⌀5.5 THRU ⌴⌀10 ▾ 3</text>'));
    expect(cbore).toBeDefined();
    expect(cbore).toContain('data-kc-fcf="⌖ ⌀0.1 A B C"');
  });

  it('puts flatness on A from ISO 2768-2 class K and the general-tolerance note in the title block', () => {
    const flat = autoGroups(svg, 'flatness');
    expect(flat).toHaveLength(1);
    expect(flat[0]).toContain('data-kc-fcf="⏥ 0.2"');
    expect(svg).toMatch(/<g id="general-tolerance"[^>]*>.*>GENERAL TOLERANCES<\/text>.*>ISO 2768-mK<\/text><\/g>/);
    expect(result.report!.generalTolerance).toBe('ISO 2768-mK');
  });

  it('dimensions hole positions from the datum planes, the overall size, and the grouped fillets', () => {
    const positions = autoGroups(svg, 'hole-position').map(g => g.match(/>([^<]+)<\/text>/)![1]).sort();
    expect(positions).toEqual(['10', '10', '25', '40', '40', '70']);
    const overall = autoGroups(svg, 'overall').map(g => g.match(/>([^<]+)<\/text>/)![1]).sort();
    expect(overall).toEqual(['10', '50', '80']);
    const fillets = autoGroups(svg, 'fillet');
    expect(fillets).toHaveLength(1);
    expect(fillets[0]).toContain('>4× R5</text>');
  });

  it('reports every annotation as placed and none overlapped', () => {
    const r = result.report!;
    expect(r.byKind).toEqual({
      'hole-position': 6, overall: 3, hole: 2, datum: 3, flatness: 1, fillet: 1, 'general-tolerance': 1,
    });
    expect(r.overlapped).toBe(0);
    expect(r.placed).toBe(16);
    expect(result.diagnostics).toEqual([]);
  });

  it('is byte-deterministic', () => {
    const again = decode(renderSvgDrawing(mountingPlate(), { format: 'svg-drawing', modelName: 'plate', autoAnnotate: true }).bytes);
    expect(again).toBe(svg);
  });
});

describe('declared GD&T overrides the automatic set', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('pins a declared datum and replaces the pattern position tolerance on the matched group only', () => {
    const r = renderSvgDrawing(mountingPlate(), {
      format: 'svg-drawing',
      autoAnnotate: true,
      declarations: {
        datums: [{ label: 'A', face: { atZ: 10 } }],
        tolerances: [{
          type: 'position', value: 0.05, modifier: '⌀', datums: ['A', 'B'],
          edge: { ofCurveType: 'CIRCLE', near: [70, 40, 10] },
        }],
      },
    });
    const svg = decode(r.bytes);
    expect(r.report!.datums[0]).toEqual({ label: 'A', source: 'declared', normal: [0, 0, 1], point: expect.any(Array) });
    expect(r.report!.datums[0].point[2]).toBe(10);
    expect(r.report!.datums.slice(1).map(d => [d.label, d.source])).toEqual([['B', 'auto'], ['C', 'auto']]);
    expect(autoGroups(svg, 'datum').filter(g => g.includes('data-kc-datum="A"'))).toHaveLength(1);
    const holes = autoGroups(svg, 'hole');
    const pattern = holes.find(g => g.includes('>4× ⌀6.5 THRU</text>'))!;
    expect(pattern).toContain('data-kc-fcf="⌖ ⌀0.05 A B"');
    expect(pattern).not.toContain('data-kc-fcf="⌖ ⌀0.1 A B C"');
    const cbore = holes.find(g => g.includes('⌴⌀10'))!;
    expect(cbore).toContain('data-kc-fcf="⌖ ⌀0.1 A B C"');
    // The declared frame was absorbed into the group, not drawn twice.
    expect(autoGroups(svg, 'tolerance')).toHaveLength(0);
  });

  it('draws declarations without autoAnnotate and keeps the bounding-box dimensions', () => {
    const r = renderSvgDrawing(mountingPlate(), {
      format: 'svg-drawing',
      declarations: {
        datums: [{ label: 'A', face: { atZ: 0 } }],
        tolerances: [{ type: 'flatness', value: 0.05, datums: [], face: { atZ: 0 } }],
      },
    });
    const svg = decode(r.bytes);
    expect(autoGroups(svg, 'datum')).toHaveLength(1);
    expect(autoGroups(svg, 'flatness')[0]).toContain('data-kc-fcf="⏥ 0.05"');
    expect(svg).not.toContain('id="general-tolerance"');
    expect(autoGroups(svg, 'hole')).toHaveLength(0);
    // Bounding-box dims survive: 80 / 10 / 50 as plain dims.
    expect((svg.match(/<g class="dim" fill/g) ?? []).length).toBe(3);
  });

  it('fails a declared datum whose face query misses with drawing.datum.unresolved', () => {
    try {
      renderSvgDrawing(mountingPlate(), {
        format: 'svg-drawing',
        declarations: { datums: [{ label: 'A', face: { atZ: 999 } }], tolerances: [] },
      });
      expect.unreachable();
    } catch (e) {
      expect((e as { code?: string }).code).toBe('drawing.datum.unresolved');
    }
  });
});

describe('autoAnnotate edge cases', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('warns drawing.auto.datum-ambiguous on a part with no planar face and still exports', () => {
    const r = renderSvgDrawing([{ name: 'ball', shape: OcctBackend.sphere(20) }], { format: 'svg-drawing', autoAnnotate: true });
    const ambiguous = r.diagnostics.filter(d => d.code === 'drawing.auto.datum-ambiguous');
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0].severity).toBe('warn');
    expect(ambiguous[0].message).toContain('A (the part has no planar faces)');
    expect(r.report!.datums).toEqual([]);
    expect(decode(r.bytes)).toContain('>ISO 2768-mK</text>');
  });

  it('names a stacked three-step bore with drawing.auto.hole-unclassified instead of dropping it', () => {
    let body = OcctBackend.box(40, 40, 30);
    body = body.subtract(OcctBackend.cylinder(12, 2).translate(20, 20, -1));
    body = body.subtract(OcctBackend.cylinder(10, 4).translate(20, 20, 10));
    body = body.subtract(OcctBackend.cylinder(12, 6).translate(20, 20, 20));
    const r = renderSvgDrawing([{ name: 'block', shape: body }], { format: 'svg-drawing', autoAnnotate: true });
    const d = r.diagnostics.find(x => x.code === 'drawing.auto.hole-unclassified');
    expect(d).toBeDefined();
    expect(d!.message).toContain('3 stacked bores');
  });

  it('calls out a countersunk hole and grouped chamfers', () => {
    // 40×40×10 block with a ⌀4 through hole countersunk ⌀8 × 90°, and the four
    // top edges chamfered 1 × 45°.
    // Cone: a right triangle (r=4.5 at z=10.5, apex at z=6, so ⌀8 at the top
    // face) on the XZ plane, revolved about world Z, then moved over the hole.
    const profile = replicad.draw([0, 6]).lineTo([4.5, 10.5]).lineTo([0, 10.5]).close();
    const cone = new OcctBackend(
      (profile.sketchOnPlane('XZ') as unknown as { revolve: (axis: [number, number, number]) => replicad.Shape3D })
        .revolve([0, 0, 1]),
    ).translate(20, 20, 0);
    const chamfered = replicad.makeBaseBox(40, 40, 10).chamfer(1, e => e.inPlane('XY', 10)).translate(20, 20, 0);
    const body = new OcctBackend(chamfered as replicad.Shape3D)
      .subtract(OcctBackend.cylinder(14, 2).translate(20, 20, -2))
      .subtract(cone);
    const r = renderSvgDrawing([{ name: 'block', shape: body }], {
      format: 'svg-drawing',
      autoAnnotate: { include: ['holes', 'chamfers'] },
    });
    const svg = decode(r.bytes);
    expect(autoGroups(svg, 'hole')[0]).toContain('>⌀4 THRU ⌵⌀8 × 90°</text>');
    // No datums were requested, so the position frame references none.
    expect(autoGroups(svg, 'hole')[0]).toContain('data-kc-fcf="⌖ ⌀0.1"');
    const chamfers = autoGroups(svg, 'chamfer').map(g => g.match(/>([^<]+)<\/text>/)![1]);
    expect(chamfers).toEqual(['2× 1 × 45°', '2× 1 × 45°']);
    expect(r.report!.byKind).toEqual({ hole: 1, chamfer: 2 });
  });

  it('rejects an unknown include entry with feature.invalid-args', () => {
    try {
      renderSvgDrawing(mountingPlate(), {
        format: 'svg-drawing',
        autoAnnotate: { include: ['holes', 'threads' as never] },
      });
      expect.unreachable();
    } catch (e) {
      expect((e as { code?: string }).code).toBe('feature.invalid-args');
      expect((e as Error).message).toContain('threads');
    }
  });
});
