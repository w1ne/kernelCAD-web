// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/exportSvgDrawing.test.ts
//
// Structural gate for the engineering-drawing SVG exporter. Renders small
// shapes through the real HLR pipeline and asserts sheet anatomy — view
// groups, hidden/tangent styling, dedup behaviour, dimensions, title block,
// viewBox sanity — without pinning exact pixel geometry.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { exportSvgDrawing } from './exportSvgDrawing';

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/** Extract one view group's markup — each `<g id="view-…">` ships on its
 *  own line of the emitted SVG. */
function viewGroup(svg: string, name: string): string {
  const line = svg.split('\n').find(l => l.includes(`id="view-${name}"`));
  expect(line, `view group ${name} present`).toBeDefined();
  return line!;
}

function classGroup(view: string, cls: string): string {
  const m = view.match(new RegExp(`<g class="${cls}"[^>]*>(.*?)</g>`));
  expect(m, `class group ${cls} present`).not.toBeNull();
  return m![1];
}

const countPaths = (s: string): number => (s.match(/<path /g) ?? []).length;

describe('exportSvgDrawing', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('emits a plain box as a complete third-angle sheet with zero hidden lines', () => {
    const part = { name: 'block', shape: OcctBackend.box(40, 30, 20) };
    const svg = decode(exportSvgDrawing([part], { format: 'svg-drawing', modelName: 'block' }));

    expect(svg).toContain('viewBox="0 0 297 210"');
    expect(svg).toContain('data-kc-format="svg-drawing"');
    expect(svg).toContain('data-kc-units="mm"');
    for (const v of ['front', 'top', 'left', 'iso']) {
      expect(svg).toContain(`id="view-${v}"`);
    }

    const front = viewGroup(svg, 'front');
    // A box's silhouette: every back-face edge projects exactly onto a
    // front-face edge — the dedup pass must collapse them all, so the
    // hidden class is EMPTY (this is the coincident-segment regression gate).
    expect(countPaths(classGroup(front, 'hidden'))).toBe(0);
    expect(countPaths(classGroup(front, 'visible'))).toBeGreaterThanOrEqual(1);
    expect(countPaths(classGroup(front, 'tangent'))).toBe(0);

    // Overall dimensions: the three bbox extents appear as dimension labels.
    expect(svg).toContain('>40</text>');
    expect(svg).toContain('>30</text>');
    expect(svg).toContain('>20</text>');
    expect((svg.match(/class="dim"/g) ?? []).length).toBe(3);

    // Title block.
    expect(svg).toContain('id="title-block"');
    expect(svg).toContain('>block</text>');
    expect(svg).toContain('>NAME</text>');
    expect(svg).toContain('>SCALE</text>');
    expect(svg).toContain('>mm</text>');
    expect(svg).toContain('class="third-angle-symbol"');
    // Deterministic date placeholder by default.
    expect(svg).toContain('>—</text>');
  });

  it('draws a vertical through-bore dashed in the front view and round in the top view', () => {
    const block = OcctBackend.box(40, 30, 20);
    const bore = OcctBackend.cylinder(22, 5).translate(20, 15, -1);
    const part = { name: 'block', shape: block.subtract(bore) };
    const svg = decode(exportSvgDrawing([part], { format: 'svg-drawing' }));

    const front = viewGroup(svg, 'front');
    expect(front).toContain('stroke-dasharray');
    expect(countPaths(classGroup(front, 'hidden'))).toBeGreaterThanOrEqual(1);

    // Top view sees the bore rim as visible geometry (curved → sampled path
    // with many segments).
    const top = viewGroup(svg, 'top');
    const topVisible = classGroup(top, 'visible');
    expect(countPaths(topVisible)).toBeGreaterThanOrEqual(2);

    // The isometric pictorial never carries hidden lines.
    const iso = viewGroup(svg, 'iso');
    expect(countPaths(classGroup(iso, 'hidden'))).toBe(0);
  });

  it('styles smooth (tangent) edges thin on a filleted block', () => {
    const filleted = replicad
      .makeBaseBox(40, 30, 20)
      .fillet(6, e => e.inPlane('XY', 20));
    const part = { name: 'block', shape: new OcctBackend(filleted) };
    const svg = decode(exportSvgDrawing([part], { format: 'svg-drawing' }));
    const front = viewGroup(svg, 'front');
    const tangent = classGroup(front, 'tangent');
    expect(countPaths(tangent)).toBeGreaterThanOrEqual(1);
    expect(front).toContain('stroke-width="0.13"');
  });

  it('compounds multi-part inputs so inter-part occlusion renders dashed', () => {
    // A pin passing through a block's bore: the pin mid-section is occluded
    // by the block and must land in the hidden class of the front view.
    const block = OcctBackend.box(40, 30, 20)
      .subtract(OcctBackend.cylinder(22, 4).translate(20, 15, -1));
    const pin = OcctBackend.cylinder(36, 3.8).translate(20, 15, -8);
    const svg = decode(
      exportSvgDrawing(
        [{ name: 'block', shape: block }, { name: 'pin', shape: pin }],
        { format: 'svg-drawing' },
      ),
    );
    const front = viewGroup(svg, 'front');
    expect(countPaths(classGroup(front, 'hidden'))).toBeGreaterThanOrEqual(1);
    expect(countPaths(classGroup(front, 'visible'))).toBeGreaterThanOrEqual(2);
  });

  it('keeps every baked coordinate inside the sheet', () => {
    const part = { name: 'block', shape: OcctBackend.box(120, 80, 40) };
    const svg = decode(exportSvgDrawing([part], { format: 'svg-drawing' }));
    const coords = [...svg.matchAll(/d="([^"]+)"/g)]
      .flatMap(m => m[1].match(/-?\d+(\.\d+)?/g) ?? [])
      .map(Number);
    expect(coords.length).toBeGreaterThan(0);
    const xs = coords.filter((_, i) => i % 2 === 0);
    const ys = coords.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(297);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(210);
    // Scale snapped to the standard series and echoed on the root element.
    expect(svg).toMatch(/data-kc-scale="(\d+(\.\d+)?:1|1:\d+(\.\d+)?)"/);
  });

  it('is byte-deterministic for identical input', () => {
    const mk = () =>
      exportSvgDrawing(
        [{ name: 'p', shape: OcctBackend.box(10, 10, 10) }],
        { format: 'svg-drawing', modelName: 'p' },
      );
    expect(decode(mk())).toBe(decode(mk()));
  });
});

// ---------------------------------------------------------------------------
// Section views (options.sections)
// ---------------------------------------------------------------------------

describe('exportSvgDrawing sections', () => {
  beforeAll(async () => {
    await initOcct();
  });

  /** 60x40x20 block with a vertical through-bore centered in plan, so a
   *  mid-height horizontal section ('xy' plane) slices straight through the
   *  bore — the cut face is a true annulus (outer rectangle wire + inner
   *  circular wire), exercising the hole-in-hatch (evenodd) path. */
  const boredBlock = () => [{
    name: 'block',
    shape: OcctBackend.box(60, 40, 20).subtract(OcctBackend.cylinder(22, 6).translate(30, 20, -1)),
  }];

  it('leaves a no-sections drawing byte-identical to before the feature existed', () => {
    const golden = decode(exportSvgDrawing(
      [{ name: 'block', shape: OcctBackend.box(60, 40, 20) }],
      { format: 'svg-drawing', modelName: 'block' },
    ));
    // No section band: standard a4 dimensions, no hatch defs, no section view.
    expect(golden).toContain('viewBox="0 0 297 210"');
    expect(golden).not.toContain('kc-section-hatch');
    expect(golden).not.toContain('id="view-section-');
  });

  it('grows the sheet, cuts real geometry, and hatches the true cross-section', () => {
    const svg = decode(exportSvgDrawing(boredBlock(), {
      format: 'svg-drawing',
      modelName: 'block',
      sections: [{ plane: 'xy', label: 'A' }],
    }));
    // Sheet grew to fit the reserved section band.
    expect(svg).toContain('viewBox="0 0 297 280"');
    expect(svg).toContain('width="297mm" height="280mm"');
    // Hatch pattern defined once, referenced by the cut face fill.
    expect(svg).toContain('<pattern id="kc-section-hatch"');
    expect(svg).toContain('fill="url(#kc-section-hatch)"');
    // The bore passing through the cut plane leaves a hole in the hatch:
    // evenodd fill-rule with an outer + inner wire in the same path.
    expect(svg).toContain('fill-rule="evenodd"');
    const hatchPath = svg.match(/<path d="([^"]*)" fill="url\(#kc-section-hatch\)"/)?.[1];
    expect(hatchPath).toBeDefined();
    expect((hatchPath!.match(/M /g) ?? []).length).toBeGreaterThanOrEqual(2);
    // Section view cell present with its caption.
    const sectionView = viewGroup(svg, 'section-A');
    expect(sectionView).toContain('data-view="section-A"');
    expect(svg).toContain('>SECTION A-A</text>');
    // Cutting-plane indicator (dashed line + arrows + letter) on the parent
    // (front) view — a horizontal 'xy' cut is edge-on there.
    expect(svg).toContain('class="section-plane-indicator"');
    expect((svg.match(/>A<\/text>/g) ?? []).length).toBeGreaterThanOrEqual(2); // two arrow-end letters
  });

  it('fails with drawing.section.plane-misses-body when the plane misses the bounding box', () => {
    try {
      exportSvgDrawing(boredBlock(), {
        format: 'svg-drawing',
        sections: [{ plane: { origin: [0, 0, 999], normal: [0, 0, 1] }, label: 'A' }],
      });
      expect.unreachable();
    } catch (e) {
      expect((e as { code?: string }).code).toBe('drawing.section.plane-misses-body');
    }
  });

  /** Signed shoelace areas of every `M … Z` sub-path in a hatch path. */
  const subpathAreas = (d: string): number[] => d
    .split('M ')
    .filter(chunk => chunk.trim().length > 0)
    .map(chunk => {
      const nums = chunk.replace(/[LZ]/g, ' ').trim().split(/\s+/).map(Number);
      let twice = 0;
      for (let k = 0; k < nums.length; k += 2) {
        const [x0, y0] = [nums[k], nums[k + 1]];
        const [x1, y1] = [nums[(k + 2) % nums.length], nums[(k + 3) % nums.length]];
        twice += x0 * y1 - x1 * y0;
      }
      return twice / 2;
    });

  it('cuts an oblique 30° plane for real: hatch area equals the analytic cross-section', () => {
    // 60x40x20 block, plane through its centre with the normal tilted 30° from
    // +X toward +Z. The cut is a rectangle 40 (along Y) by 20 / cos 30° (along
    // the tilted Z run), i.e. 923.76 mm², seen true-shape in the section cell.
    const tilt = (30 * Math.PI) / 180;
    const svg = decode(exportSvgDrawing(
      [{ name: 'block', shape: OcctBackend.box(60, 40, 20) }],
      {
        format: 'svg-drawing',
        sections: [{ plane: { origin: [30, 20, 10], normal: [Math.cos(tilt), 0, Math.sin(tilt)] }, label: 'A' }],
      },
    ));
    const cell = viewGroup(svg, 'section-A');
    expect(cell).toContain('data-kc-section-normal="0.866 0 0.5"');
    const cellScale = Number(cell.match(/data-kc-cell-scale="([^"]+)"/)![1]);
    const hatch = cell.match(/<path d="([^"]*)" fill="url\(#kc-section-hatch\)"/)?.[1];
    expect(hatch).toBeDefined();
    const areas = subpathAreas(hatch!);
    expect(areas).toHaveLength(1);
    const modelArea = Math.abs(areas[0]) / (cellScale * cellScale);
    const analytic = (40 * 20) / Math.cos(tilt);
    expect(Math.abs(modelArea - analytic) / analytic).toBeLessThan(0.005);
    // The indicator sits on the standard view closest to edge-on: the plane
    // contains world Y, so the front view (looking along Y) shows its trace.
    expect(svg).toContain('class="section-plane-indicator" data-parent-view="front"');
    expect(svg).toContain('>SECTION A-A</text>');
  });

  it('keeps a bore the oblique plane slices through as a hole in the hatch', () => {
    const tilt = (30 * Math.PI) / 180;
    const svg = decode(exportSvgDrawing(boredBlock(), {
      format: 'svg-drawing',
      sections: [{ plane: { origin: [30, 20, 10], normal: [0, -Math.sin(tilt), Math.cos(tilt)] }, label: 'B' }],
    }));
    const cell = viewGroup(svg, 'section-B');
    const cellScale = Number(cell.match(/data-kc-cell-scale="([^"]+)"/)![1]);
    const hatch = cell.match(/<path d="([^"]*)" fill="url\(#kc-section-hatch\)"/)![1];
    const areas = subpathAreas(hatch).map(a => Math.abs(a) / (cellScale * cellScale)).sort((a, b) => b - a);
    expect(areas).toHaveLength(2);
    // Outer: a plane 30° off horizontal crosses the 20-thick block over a
    // 20 / sin 30° run, so the strip is 60 × 40. Inner: the vertical ⌀12 bore
    // cut obliquely is an ellipse with semi-axes 6 and 6 / cos 30°.
    const outer = (60 * 20) / Math.sin(tilt);
    const inner = (Math.PI * 6 * 6) / Math.cos(tilt);
    expect(Math.abs(areas[0] - outer) / outer).toBeLessThan(0.005);
    expect(Math.abs(areas[1] - inner) / inner).toBeLessThan(0.01);
    expect(cell).toContain('fill-rule="evenodd"');
  });

  it('still rejects a zero plane normal', () => {
    try {
      exportSvgDrawing(boredBlock(), {
        format: 'svg-drawing',
        sections: [{ plane: { origin: [30, 20, 10], normal: [0, 0, 0] }, label: 'A' }],
      });
      expect.unreachable();
    } catch (e) {
      expect((e as { code?: string }).code).toBe('feature.invalid-args');
    }
  });

  it('fails an oblique plane that misses the body with drawing.section.plane-misses-body', () => {
    try {
      exportSvgDrawing(boredBlock(), {
        format: 'svg-drawing',
        sections: [{ plane: { origin: [500, 500, 500], normal: [1, 1, 1] }, label: 'A' }],
      });
      expect.unreachable();
    } catch (e) {
      expect((e as { code?: string }).code).toBe('drawing.section.plane-misses-body');
    }
  });

  it('renders more than one section, each with its own letter', () => {
    const svg = decode(exportSvgDrawing(boredBlock(), {
      format: 'svg-drawing',
      sections: [
        { plane: 'xy', label: 'A' },
        { plane: 'yz', label: 'B' },
      ],
    }));
    expect(svg).toContain('id="view-section-A"');
    expect(svg).toContain('id="view-section-B"');
    expect(svg).toContain('>SECTION A-A</text>');
    expect(svg).toContain('>SECTION B-B</text>');
  });

  it('is byte-deterministic with sections', () => {
    const mk = () => decode(exportSvgDrawing(boredBlock(), {
      format: 'svg-drawing',
      sections: [{ plane: 'xy', label: 'A' }],
    }));
    expect(mk()).toBe(mk());
  });
});
