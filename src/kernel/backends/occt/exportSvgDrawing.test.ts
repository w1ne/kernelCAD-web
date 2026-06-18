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
