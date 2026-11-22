// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Analytic tests for the "derive a sketch from a solid" primitives:
//   shape.sectionSketch(plane), shape.faceSketch(face), shape.silhouette(dir)
//
// The expectations are closed-form, not golden files: a box with a through-hole
// sectioned at mid-height encloses w·d − πr²; a cylinder silhouettes as a
// circle along its axis and a rectangle across it; a face sketch of a box top
// extrudes back to the same volume.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { extractFlatProfile } from '../../src/kernel/backends/occt/planarProfile';
import { segmentsPerimeter, segmentsSignedArea } from '../../src/kernel/backends/occt/sketchFromShape';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { inspectSectionTool } from '../../src/agent/mcp/tools/inspectSection';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function lowerScript(code: string) {
  const { records, session } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(session));
  const r = await engine.run(records);
  return { records, session, shapes: r.shapes, diagnostics: r.diagnostics as CompilerDiagnostic[] };
}

function lastShape(shapes: Map<string, unknown>, records: Array<{ id: string }>): OcctBackend {
  const last = records[records.length - 1];
  return shapes.get(last.id) as OcctBackend;
}

describe('shape.sectionSketch — analytic sections', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('sections a box with a through-hole at mid-height: area = w·d − πr²', async () => {
    // 40 × 20 × 10 box, Ø8 through-hole at the centre.
    const code = `
      const part = box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through' });
      const sec = await part.sectionSketch({ plane: 'xy', offset: 5 });
      return sec.extrude(1);
    `;
    const { records, shapes, diagnostics } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const slab = lastShape(shapes, records);
    const expectedArea = 40 * 20 - Math.PI * 4 * 4;
    // Extruded by 1 mm → volume equals the section area.
    expect(slab.volume()).toBeCloseTo(expectedArea, 0);
  });

  it('exposes section area / loop / hole counts on the sketch metadata', async () => {
    const code = `
      const part = box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through' });
      const sec = await part.sectionSketch({ plane: 'xy', offset: 5 });
      sec.extrude(1);
      return sec;
    `;
    // A sketch record is not a measurable 3D shape; read it from records.
    const { records, session } = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(createOcctLowerer(session));
    await engine.run(records);
    const secRecord = records.find(
      r => (r.metadata as { derivedFrom?: string } | undefined)?.derivedFrom === 'section',
    )!;
    const md = secRecord.metadata as { loopCount?: number; holeCount?: number; sectionAreaMm2?: number };
    expect(md.loopCount).toBe(2);
    expect(md.holeCount).toBe(1);
    expect(md.sectionAreaMm2).toBeCloseTo(40 * 20 - Math.PI * 16, 0);
  });

  it('throws feature.section.plane-misses-body when the plane misses the body', async () => {
    const code = `
      const part = box(10, 10, 10);
      const sec = await part.sectionSketch({ plane: 'xy', offset: 100 });
      return sec.extrude(1);
    `;
    await expect(lowerScript(code)).rejects.toThrow(/does not intersect/);
  });
});

describe('shape.faceSketch — planar face boundaries', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('round-trips a box top face through extrude to the same volume', async () => {
    const code = `
      const part = box(30, 20, 10);
      const top = await part.faceSketch('top');
      return top.extrude(10);
    `;
    const { records, shapes, diagnostics } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const prism = lastShape(shapes, records);
    expect(prism.volume()).toBeCloseTo(30 * 20 * 10, 0);
  });

  it('keeps a hole as an inner loop: extrude of the top face of a holed plate', async () => {
    // Same 40 × 20 × 10 plate with a Ø8 through-hole at the face centre as the
    // section test: the top face's inner wire is the hole.
    const code = `
      const plate = box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through' });
      const top = await plate.faceSketch('top');
      return top.extrude(10);
    `;
    const { records, shapes, diagnostics } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const prism = lastShape(shapes, records);
    const expected = (40 * 20 - Math.PI * 16) * 10;
    expect(prism.volume()).toBeCloseTo(expected, -1);
  });

  // A rounded plate: 40 × 20 × 10 with the four vertical edges filleted at
  // R3. Its top and bottom faces are a rounded rectangle whose corner arcs
  // are 90° each; OCCT stores some of them clockwise in the sketch frame.
  const ROUNDED_PLATE = `box(40, 20, 10).fillet(3, { parallelTo: 'z' })`;
  const ROUNDED_AREA = 40 * 20 - (4 - Math.PI) * 3 * 3;

  for (const face of ['top', 'bottom'] as const) {
    it(`keeps the 90° corner arcs of a rounded plate (${face} face)`, async () => {
      const code = `
        const plate = ${ROUNDED_PLATE};
        const outline = await plate.faceSketch('${face}');
        return outline.extrude(10);
      `;
      const { records, shapes, diagnostics } = await lowerScript(code);
      expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);

      // Every corner is a quarter circle: |bulge| = tan(π/8). A 270° arc
      // (|bulge| = tan(3π/8)) is the complementary arc of the same circle.
      const sketch = records.filter(r => r.kind === 'sketch').pop()!;
      const commands = (sketch.metadata as { commands: Array<{ kind: string; bulge?: { evaluated: number } }> }).commands;
      const bulges = commands.filter(c => c.kind === 'bulgeArc').map(c => Math.abs(c.bulge!.evaluated));
      expect(bulges).toHaveLength(4);
      for (const b of bulges) expect(b).toBeCloseTo(Math.tan(Math.PI / 8), 6);

      const prism = lastShape(shapes, records);
      expect(isValidShape(getOC(), prism.getReplicadShape().wrapped)).toBe(true);
      expect(prism.volume()).toBeCloseTo(ROUNDED_AREA * 10, 3);
      const bbox = prism.boundingBox();
      expect(bbox.max[0] - bbox.min[0]).toBeCloseTo(40, 6);
      expect(bbox.max[1] - bbox.min[1]).toBeCloseTo(20, 6);
    });
  }

  it('sections the rounded plate to the same rounded rectangle', async () => {
    const code = `
      const plate = ${ROUNDED_PLATE};
      const sec = await plate.sectionSketch({ plane: 'xy', offset: 5 });
      return sec.extrude(10);
    `;
    const { records, shapes, diagnostics } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const prism = lastShape(shapes, records);
    expect(isValidShape(getOC(), prism.getReplicadShape().wrapped)).toBe(true);
    expect(prism.volume()).toBeCloseTo(ROUNDED_AREA * 10, 3);
  });

  it('gives the flat DXF profile of the rounded plate its true area', async () => {
    const { records, shapes } = await lowerScript(`return ${ROUNDED_PLATE};`);
    const flat = extractFlatProfile(lastShape(shapes, records));
    expect(flat.ok).toBe(true);
    if (!flat.ok) return;
    expect(flat.profile.loops).toHaveLength(1);
    const outline = flat.profile.loops[0];
    const bulges = outline.map(s => Math.abs(s.bulge ?? 0)).filter(b => b > 0);
    expect(bulges).toHaveLength(4);
    for (const b of bulges) expect(b).toBeCloseTo(Math.tan(Math.PI / 8), 6);
    expect(Math.abs(segmentsSignedArea(outline))).toBeCloseTo(ROUNDED_AREA, 6);
    expect(segmentsPerimeter(outline)).toBeCloseTo(2 * (34 + 14) + 2 * Math.PI * 3, 6);
  });

  it('refuses a cylindrical face with feature.face-sketch.non-planar', async () => {
    // The hole's `wall` is a created cylindrical face ref.
    const code = `
      const plate = box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through' });
      const s = await plate.faceSketch({ face: 'wall' });
      return s.extrude(1);
    `;
    await expect(lowerScript(code)).rejects.toThrow(/non-planar/);
  });
});

describe('shape.silhouette — orthographic outlines', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('silhouettes a cylinder along its axis as a circle (area ≈ πr²)', async () => {
    const code = `
      const cyl = cylinder(20, 6);
      const outline = await cyl.silhouette([0, 0, 1]);
      return outline.extrude(1);
    `;
    const { records, shapes, diagnostics } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const slab = lastShape(shapes, records);
    expect(slab.volume()).toBeCloseTo(Math.PI * 36, 0);
  });

  it('silhouettes a cylinder across its axis as a rectangle (area ≈ 2r·h)', async () => {
    const code = `
      const cyl = cylinder(20, 6);
      const outline = await cyl.silhouette([1, 0, 0]);
      return outline.extrude(1);
    `;
    const { records, shapes, diagnostics } = await lowerScript(code);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const slab = lastShape(shapes, records);
    expect(slab.volume()).toBeCloseTo(2 * 6 * 20, 0);
  });
});

describe("inspect({ of: 'section' }) — numeric probes", () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports area / perimeter / loop / hole counts for one slice', async () => {
    const code = `
      return box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through' });
    `;
    const out = await inspectSectionTool({ code, plane: { plane: 'xy', offset: 5 } });
    expect(out.ok).toBe(true);
    const s = out.slices![0];
    expect(s.loopCount).toBe(2);
    expect(s.holeCount).toBe(1);
    expect(s.area).toBeCloseTo(40 * 20 - Math.PI * 16, 0);
    const expectedPerimeter = 2 * (40 + 20) + 2 * Math.PI * 4;
    expect(s.perimeter).toBeCloseTo(expectedPerimeter, 0);
  });

  it('stack scan finds the neck of a dumbbell (minimum area at the waist)', async () => {
    // Two fat bodies (20 × 10 cross-section) joined by a thin 4 mm neck.
    const code = `
      const bodyL = box(15, 20, 10);
      const bodyR = box(15, 20, 10).translate(35, 0, 0);
      const neck = box(20, 4, 10).translate(15, 8, 0);
      return bodyL.union(neck, bodyR);
    `;
    const out = await inspectSectionTool({
      code,
      stack: { from: 5, to: 45, count: 41, axis: 'x' },
    });
    expect(out.ok).toBe(true);
    const slices = out.slices!;
    expect(slices).toHaveLength(41);
    // Waist area = neck (4 × 10 = 40); body area = 200.
    expect(out.minAreaPosition).toBeGreaterThanOrEqual(14);
    expect(out.minAreaPosition).toBeLessThanOrEqual(36);
    expect(slices[out.minAreaIndex!].area).toBeCloseTo(40, 0);
    // Ends are the fat bodies.
    expect(slices[0].area).toBeCloseTo(200, 0);
    expect(slices[slices.length - 1].area).toBeCloseTo(200, 0);
  });
});

