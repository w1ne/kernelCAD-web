// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sketch.offset(distance): parallel curve of a closed profile.
//
// The expectations are closed-form. For a convex outline of area A and
// perimeter P, a round outward offset by d encloses A + P·d + π·d²; a sharp
// outward offset of a rectangle is (w + 2d)(h + 2d); an inward offset of a
// rectangle is (w − 2d)(h − 2d). A hole of radius r becomes r ∓ d.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';
import type { SketchCommand } from '../../src/shared/capture/sketchCommand';

async function lowerScript(code: string) {
  const { records, session } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(session));
  const r = await engine.run(records);
  expect((r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error')).toEqual([]);
  const solid = r.shapes.get(records[records.length - 1].id) as OcctBackend;
  expect(isValidShape(getOC(), solid.getReplicadShape().wrapped)).toBe(true);
  return { records, solid };
}

/** Faces that are not planar: one per exact arc of an extruded profile. */
function curvedFaceCount(solid: OcctBackend): number {
  const faces = (solid.getReplicadShape() as unknown as { faces: Array<{ geomType: string }> }).faces;
  return faces.filter((f) => f.geomType.toUpperCase() !== 'PLANE').length;
}

interface OffsetMetadata {
  commands: SketchCommand[];
  derivedFrom?: string;
  loopCount?: number;
  holeCount?: number;
  areaMm2?: number;
  offsetDistanceMm?: number;
}

function offsetRecords(records: Array<{ metadata?: unknown }>): OffsetMetadata[] {
  return records
    .map((r) => r.metadata as OffsetMetadata | undefined)
    .filter((m): m is OffsetMetadata => m?.derivedFrom === 'offset');
}

const RECT = `path().moveTo(0, 0).lineTo(40, 0).lineTo(40, 20).lineTo(0, 20).close()`;
const HOLED = `box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through' })`;
// Two 20 × 20 squares joined by a neck 4 mm wide.
const DUMBBELL = `path().moveTo(0, 0).lineTo(20, 0).lineTo(20, 8).lineTo(40, 8).lineTo(40, 0).lineTo(60, 0)
  .lineTo(60, 20).lineTo(40, 20).lineTo(40, 12).lineTo(20, 12).lineTo(20, 20).lineTo(0, 20).close()`;

describe('Sketch.offset — closed-form areas', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('shrinks a rectangle: (w − 2d)(h − 2d), corners stay sharp', async () => {
    const { records, solid } = await lowerScript(`
      const inner = await ${RECT}.offset(-2);
      return inner.extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo(36 * 16 * 5, 6);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(2, 6);
    expect(bb.max[0]).toBeCloseTo(38, 6);
    expect(bb.min[1]).toBeCloseTo(2, 6);
    expect(bb.max[1]).toBeCloseTo(18, 6);
    const [md] = offsetRecords(records);
    expect(md.commands.some((c) => c.kind === 'bulgeArc')).toBe(false);
    expect(md.loopCount).toBe(1);
    expect(md.holeCount).toBe(0);
    expect(md.offsetDistanceMm).toBe(-2);
    expect(md.areaMm2).toBeCloseTo(576, 6);
  });

  it('grows a rectangle with round corners: A + P·d + π·d², four exact R = d arcs', async () => {
    const { records, solid } = await lowerScript(`
      const outer = await ${RECT}.offset(2);
      return outer.extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(800 + 120 * 2 + Math.PI * 4, 6);
    const arcs = offsetRecords(records)[0].commands.filter((c) => c.kind === 'bulgeArc');
    expect(arcs).toHaveLength(4);
    // A 90° arc has bulge tan(90° / 4).
    for (const arc of arcs) {
      expect(Math.abs((arc as { bulge: { evaluated: number } }).bulge.evaluated)).toBeCloseTo(Math.tan(Math.PI / 8), 9);
    }
    // Exact arcs extrude to four cylinder faces, not to a faceted wall.
    expect(curvedFaceCount(solid)).toBe(4);
  });

  it("grows a rectangle with corners: 'sharp': (w + 2d)(h + 2d)", async () => {
    const { records, solid } = await lowerScript(`
      const outer = await ${RECT}.offset(2, { corners: 'sharp' });
      return outer.extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(44 * 24, 6);
    expect(offsetRecords(records)[0].commands.some((c) => c.kind === 'bulgeArc')).toBe(false);
  });

  it('gives the same region for a clockwise source path', async () => {
    const { solid } = await lowerScript(`
      const cw = path().moveTo(0, 0).lineTo(0, 20).lineTo(40, 20).lineTo(40, 0).close();
      return (await cw.offset(-2)).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo(36 * 16 * 5, 6);
  });

  it('keeps arcs as arcs: a slot offset inward is a slot with a smaller radius', async () => {
    // 30 mm straight, R5 ends. Inset 2 → R3 ends, same centres.
    const { records, solid } = await lowerScript(`
      const slot = path().moveTo(0, 0).lineTo(30, 0).bulgeArc(30, 10, 1).lineTo(0, 10).bulgeArc(0, 0, 1).close();
      return (await slot.offset(-2)).extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(30 * 6 + Math.PI * 9, 6);
    const arcs = offsetRecords(records)[0].commands.filter((c) => c.kind === 'bulgeArc');
    expect(arcs).toHaveLength(2);
    expect(curvedFaceCount(solid)).toBe(2);
  });

  it('offsets a rounded rectangle to concentric corners: R6 becomes R4 inward and R8 outward', async () => {
    // 60 × 40 with R6 corners; area of the outline moved d outward is
    // (60 + 2d)(40 + 2d) − (4 − π)(6 + d)².
    const rounded = `path().moveTo(-24, -20).lineTo(24, -20).radiusArc(30, -14, -6).lineTo(30, 14).radiusArc(24, 20, -6)
      .lineTo(-24, 20).radiusArc(-30, 14, -6).lineTo(-30, -14).radiusArc(-24, -20, -6).close()`;
    for (const d of [-2, 2]) {
      const { records, solid } = await lowerScript(`return (await ${rounded}.offset(${d})).extrude(1);`);
      expect(solid.volume()).toBeCloseTo((60 + 2 * d) * (40 + 2 * d) - (4 - Math.PI) * (6 + d) ** 2, 6);
      const commands = offsetRecords(records)[0].commands;
      expect(commands.filter((c) => c.kind === 'bulgeArc')).toHaveLength(4);
      expect(commands.filter((c) => c.kind === 'lineTo')).toHaveLength(4);
      expect(curvedFaceCount(solid)).toBe(4);
    }
  });

  it('rounds the reflex corner of an L when it shrinks', async () => {
    // L: 30 × 30 with a 20 × 20 notch. Inset 3 keeps the five convex corners
    // sharp and rounds the reflex one at R3.
    const { solid } = await lowerScript(`
      const ell = path().moveTo(0, 0).lineTo(30, 0).lineTo(30, 10).lineTo(10, 10).lineTo(10, 30).lineTo(0, 30).close();
      return (await ell.offset(-3)).extrude(1);
    `);
    // Sharp inset is 24·4 + 4·20 = 176; the round reflex corner adds 9 − 9π/4.
    expect(solid.volume()).toBeCloseTo(176 + 9 - (9 * Math.PI) / 4, 6);
  });
});

describe('Sketch.offset — profiles with holes', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('grows the region: the outline moves out and the hole shrinks', async () => {
    const { records, solid } = await lowerScript(`
      const face = await ${HOLED}.faceSketch('top');
      return (await face.offset(2)).extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(800 + 120 * 2 + Math.PI * 4 - Math.PI * 2 * 2, 6);
    const [md] = offsetRecords(records);
    expect(md.loopCount).toBe(2);
    expect(md.holeCount).toBe(1);
  });

  it('shrinks the region: the outline moves in and the hole grows', async () => {
    const { solid } = await lowerScript(`
      const face = await ${HOLED}.faceSketch('top');
      return (await face.offset(-2)).extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(36 * 16 - Math.PI * 6 * 6, 6);
  });

  it('drops a hole that an outward offset closes', async () => {
    // Ø8 hole, offset 5 > r: the hole is gone and the outline is plain.
    const { records, solid } = await lowerScript(`
      const face = await ${HOLED}.faceSketch('top');
      return (await face.offset(5)).extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(800 + 120 * 5 + Math.PI * 25, 6);
    expect(offsetRecords(records)[0].loopCount).toBe(1);
  });
});

describe('Sketch.offset — real jobs', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('builds a 2 mm wall from an outline and its inward offset; the source is unchanged', async () => {
    const { solid } = await lowerScript(`
      const outline = ${RECT};
      const cavity = await outline.offset(-2);
      return outline.extrude(10).subtract(cavity.extrude(10));
    `);
    expect(solid.volume()).toBeCloseTo((800 - 576) * 10, 6);
  });

  it('chains: an offset of an offset equals one offset by the sum', async () => {
    const { solid } = await lowerScript(`
      const once = await ${RECT}.offset(1);
      return (await once.offset(1)).extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(800 + 120 * 2 + Math.PI * 4, 6);
  });

  it('offsets a reflected sketch', async () => {
    const { solid } = await lowerScript(`
      return (await ${RECT}.reflect('x').offset(-2)).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo(36 * 16 * 5, 6);
    expect(solid.boundingBox().max[1]).toBeCloseTo(-2, 6);
  });
});

describe('Sketch.offset — refusals', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  const run = (code: string) => runScript({ code, fileName: 'test.kcad.ts' });

  it('refuses an inset that removes the profile', async () => {
    await expect(run(`return (await ${RECT}.offset(-12)).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-offset.collapsed' });
    // Exactly half the width: a zero-area sliver, not a profile.
    await expect(run(`return (await ${RECT}.offset(-10)).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-offset.collapsed' });
  });

  it('refuses an inset that splits the profile into two islands', async () => {
    await expect(run(`return (await ${DUMBBELL}.offset(-3)).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-offset.split' });
  });

  it('refuses an inset that pinches the neck to zero width', async () => {
    // The neck is 4 mm wide, so at −2 the two sides meet on a line: the kernel
    // returns one closed loop that would extrude to a non-manifold solid.
    await expect(run(`return (await ${DUMBBELL}.offset(-2)).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-offset.split' });
    // 1 mm short of the pinch it is one valid profile.
    const { solid } = await lowerScript(`return (await ${DUMBBELL}.offset(-1)).extrude(1);`);
    // Two 18 × 18 squares, a 22 × 2 neck, less the four R1 fillets' corners.
    expect(solid.volume()).toBeCloseTo(2 * 18 * 18 + 22 * 2 + 4 * (1 - Math.PI / 4), 6);
  });

  it('refuses a hole that grows into the boundary', async () => {
    // Ø8 hole centred in a 20 mm wide plate: 6 mm of wall each side, so an
    // inset of 3 makes the hole touch the boundary and 4 cuts the plate in two.
    for (const d of [-3, -4]) {
      await expect(run(`
        const face = await ${HOLED}.faceSketch('top');
        return (await face.offset(${d})).extrude(1);
      `)).rejects.toMatchObject({ code: 'feature.sketch-offset.split' });
    }
  });

  it('rejects a zero, non-finite, non-number or param() distance', async () => {
    for (const d of ['0', 'NaN', 'Infinity', "'2'", 'undefined', "param('d', 2)"]) {
      await expect(run(`return (await ${RECT}.offset(${d})).extrude(1);`))
        .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('distance') });
    }
  });

  it('rejects a param()-driven profile instead of freezing it', async () => {
    await expect(run(`
      const w = param('w', 40);
      const outline = path().moveTo(0, 0).lineTo(w, 0).lineTo(w, 20).lineTo(0, 20).close();
      return (await outline.offset(-2)).extrude(1);
    `)).rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('param()') });
  });

  it('rejects a spline profile', async () => {
    await expect(run(`
      const blob = path().moveTo(0, 0).lineTo(30, 0).smoothSpline(15, 20).smoothSpline(0, 0).close();
      return (await blob.offset(1)).extrude(1);
    `)).rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('smoothSpline') });
  });

  it('rejects an unknown option and an unknown corners value', async () => {
    await expect(run(`return (await ${RECT}.offset(2, { join: 'miter' })).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('join') });
    await expect(run(`return (await ${RECT}.offset(2, { corners: 'miter' })).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('corners') });
  });

  it('names the missing await when a Sketch method is chained on the promise', async () => {
    await expect(run(`return ${RECT}.offset(-2).extrude(1);`))
      .rejects.toMatchObject({
        code: 'feature.async-result.missing-await',
        message: expect.stringContaining('(await sketch.offset(...)).extrude(...)'),
      });
  });
});
