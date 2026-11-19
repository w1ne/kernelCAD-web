// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sketch.union / Sketch.subtract / Sketch.intersect: 2D booleans of closed
// profiles.
//
// The expectations are closed-form. RECT is 40 × 20 mm (800 mm²). EDGE_DISC
// is a Ø16 disc centred on the rectangle's right edge, so exactly half of it
// (32π mm²) lies inside the rectangle.

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

function faceCount(solid: OcctBackend): number {
  return (solid.getReplicadShape() as unknown as { faces: unknown[] }).faces.length;
}

interface BooleanMetadata {
  commands: SketchCommand[];
  derivedFrom?: string;
  loopCount?: number;
  holeCount?: number;
  areaMm2?: number;
  operandAreasMm2?: number[];
}

function booleanRecords(records: Array<{ metadata?: unknown }>): BooleanMetadata[] {
  return records
    .map((r) => r.metadata as BooleanMetadata | undefined)
    .filter((m): m is BooleanMetadata => ['union', 'subtract', 'intersect'].includes(m?.derivedFrom ?? ''));
}

const kinds = (md: BooleanMetadata) => md.commands.map((c) => c.kind);

const RECT = `path().moveTo(0, 0).lineTo(40, 0).lineTo(40, 20).lineTo(0, 20).close()`;
const EDGE_DISC = `path().circle(40, 10, 8)`;
const INNER_DISC = `path().circle(20, 10, 5)`;
const FAR_DISC = `path().circle(100, 10, 5)`;
// Shares the whole right edge of RECT.
const NEIGHBOUR = `path().moveTo(40, 0).lineTo(60, 0).lineTo(60, 20).lineTo(40, 20).close()`;
// Crosses RECT from below to above.
const BAR = `path().moveTo(18, -5).lineTo(22, -5).lineTo(22, 25).lineTo(18, 25).close()`;

describe('Sketch booleans — closed-form areas', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('union: rectangle plus half a disc, one exact arc, no seam', async () => {
    const { records, solid } = await lowerScript(`
      return (await ${RECT}.union(${EDGE_DISC})).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo((800 + 32 * Math.PI) * 5, 6);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 6);
    expect(bb.max[0]).toBeCloseTo(48, 6);
    const [md] = booleanRecords(records);
    expect(md.derivedFrom).toBe('union');
    expect(md.loopCount).toBe(1);
    expect(md.areaMm2).toBeCloseTo(800 + 32 * Math.PI, 6);
    expect(md.operandAreasMm2?.[0]).toBeCloseTo(800, 6);
    expect(md.operandAreasMm2?.[1]).toBeCloseTo(64 * Math.PI, 6);
    // Five straight sides (the right side is split by the disc) and one arc.
    expect(kinds(md).filter((k) => k === 'bulgeArc')).toHaveLength(1);
    expect(kinds(md).filter((k) => k === 'lineTo')).toHaveLength(5);
    // 5 planar walls + 1 cylinder wall + 2 caps: the part of the rectangle's
    // edge inside the disc left no face.
    expect(faceCount(solid)).toBe(8);
  });

  it('subtract: a profile crossing the outline cuts a notch', async () => {
    const { records, solid } = await lowerScript(`
      return (await ${RECT}.subtract(${EDGE_DISC})).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo((800 - 32 * Math.PI) * 5, 6);
    expect(solid.boundingBox().max[0]).toBeCloseTo(40, 6);
    const [md] = booleanRecords(records);
    expect(md.loopCount).toBe(1);
    expect(md.holeCount).toBe(0);
  });

  it('subtract: a profile inside the outline becomes a hole', async () => {
    const { records, solid } = await lowerScript(`
      return (await ${RECT}.subtract(${INNER_DISC})).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo((800 - 25 * Math.PI) * 5, 6);
    const [md] = booleanRecords(records);
    expect(md.loopCount).toBe(2);
    expect(md.holeCount).toBe(1);
    expect(md.areaMm2).toBeCloseTo(800 - 25 * Math.PI, 6);
  });

  it('intersect: the half disc inside the rectangle', async () => {
    const { solid } = await lowerScript(`
      return (await ${RECT}.intersect(${EDGE_DISC})).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo(32 * Math.PI * 5, 6);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(32, 6);
    expect(bb.max[0]).toBeCloseTo(40, 6);
    expect(bb.min[1]).toBeCloseTo(2, 6);
    expect(bb.max[1]).toBeCloseTo(18, 6);
  });

  it('intersect: the lens of two R10 discs 12 mm apart', async () => {
    const { solid } = await lowerScript(`
      return (await path().circle(0, 0, 10).intersect(path().circle(12, 0, 10))).extrude(1);
    `);
    // 2r²·acos(d / 2r) − (d / 2)·√(4r² − d²)
    expect(solid.volume()).toBeCloseTo(200 * Math.acos(0.6) - 6 * 16, 6);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(2, 6);
    expect(bb.max[0]).toBeCloseTo(10, 6);
  });

  it('union: profiles that share an edge merge into one four-sided outline', async () => {
    const { records, solid } = await lowerScript(`
      return (await ${RECT}.union(${NEIGHBOUR})).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo(1200 * 5, 6);
    const [md] = booleanRecords(records);
    expect(kinds(md)).toEqual(['moveTo', 'lineTo', 'lineTo', 'lineTo', 'lineTo', 'close']);
    expect(faceCount(solid)).toBe(6);
  });

  it('gives the same result for clockwise and counter-clockwise operands', async () => {
    const clockwise = `path().moveTo(0, 0).lineTo(0, 20).lineTo(40, 20).lineTo(40, 0).close()`;
    for (const [a, b] of [[clockwise, EDGE_DISC], [EDGE_DISC, clockwise]]) {
      const { solid } = await lowerScript(`return (await ${a}.intersect(${b})).extrude(1);`);
      expect(solid.volume()).toBeCloseTo(32 * Math.PI, 6);
    }
    const { solid: joined } = await lowerScript(`return (await ${clockwise}.union(${NEIGHBOUR})).extrude(1);`);
    expect(joined.volume()).toBeCloseTo(1200, 6);
    const { solid: holed } = await lowerScript(`return (await ${clockwise}.subtract(${INNER_DISC})).extrude(1);`);
    expect(holed.volume()).toBeCloseTo(800 - 25 * Math.PI, 6);
  });

  it('union: a profile that fills a hole removes the hole', async () => {
    const { records, solid } = await lowerScript(`
      const holed = await ${RECT}.subtract(${INNER_DISC});
      return (await holed.union(${INNER_DISC})).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo(800 * 5, 6);
    expect(booleanRecords(records)[1].loopCount).toBe(1);
  });
});

describe('Sketch booleans — several operands', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('subtract takes an array: a notch and a hole in one call', async () => {
    const { records, solid } = await lowerScript(`
      return (await ${RECT}.subtract([${INNER_DISC}, ${EDGE_DISC}])).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo((800 - 25 * Math.PI - 32 * Math.PI) * 5, 6);
    const [md] = booleanRecords(records);
    expect(md.loopCount).toBe(2);
    expect(md.operandAreasMm2).toHaveLength(3);
  });

  it('union takes an array', async () => {
    const { solid } = await lowerScript(`
      return (await ${RECT}.union([${NEIGHBOUR}, ${EDGE_DISC}])).extrude(5);
    `);
    // The disc is inside RECT ∪ NEIGHBOUR, so it adds nothing.
    expect(solid.volume()).toBeCloseTo(1200 * 5, 6);
  });

  it('intersect with an array keeps what every profile shares', async () => {
    // RECT ∩ disc is the left half disc; the quadrant x 32..40, y 10..20 of it
    // is a quarter disc.
    const { solid } = await lowerScript(`
      const quadrant = path().moveTo(32, 10).lineTo(48, 10).lineTo(48, 20).lineTo(32, 20).close();
      return (await ${RECT}.intersect([${EDGE_DISC}, quadrant])).extrude(5);
    `);
    expect(solid.volume()).toBeCloseTo(16 * Math.PI * 5, 6);
  });
});

describe('Sketch booleans — real jobs', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  // Slot 8 × 14 with an R7 head centred 4 mm above the slot top. The head
  // overlaps the slot over ∫(√(49 − x²) − 4)dx, x = −4..4.
  const overlap = 4 * Math.sqrt(33) + 49 * Math.asin(4 / 7) - 32;
  const keyholeArea = 8 * 14 + 49 * Math.PI - overlap;

  it('keyhole hanger plate: union builds the keyhole, subtract makes it a hole', async () => {
    const { records, solid } = await lowerScript(`
      const slot = path().moveTo(-4, 0).lineTo(4, 0).lineTo(4, 14).lineTo(-4, 14).close();
      const keyhole = await slot.union(path().circle(0, 18, 7));
      const outline = path().moveTo(-15, -6).lineTo(15, -6).lineTo(15, 32).lineTo(-15, 32).close();
      return (await outline.subtract(keyhole)).extrude(3);
    `);
    expect(solid.volume()).toBeCloseTo((30 * 38 - keyholeArea) * 3, 6);
    const [keyhole, plate] = booleanRecords(records);
    expect(keyhole.areaMm2).toBeCloseTo(keyholeArea, 6);
    // Slot floor, two slot walls, one head arc.
    expect(kinds(keyhole).filter((k) => k === 'lineTo')).toHaveLength(3);
    expect(kinds(keyhole).filter((k) => k === 'bulgeArc')).toHaveLength(1);
    expect(plate.holeCount).toBe(1);
  });

  it('the sources are unchanged and the result feeds Sketch.offset', async () => {
    const { solid } = await lowerScript(`
      const rect = ${RECT};
      const disc = ${INNER_DISC};
      const holed = await rect.subtract(disc);
      const land = await holed.offset(-1);
      // rect and disc still extrude as themselves.
      return rect.extrude(1).subtract(disc.extrude(1)).subtract(land.extrude(1));
    `);
    // (rect − R5 disc) less its 1 mm inset (38 × 18 − R6 disc).
    expect(solid.volume()).toBeCloseTo(800 - 25 * Math.PI - (38 * 18 - 36 * Math.PI), 6);
  });

  it('combines a faceSketch with a drawn profile', async () => {
    const { solid } = await lowerScript(`
      const face = await box(40, 20, 10).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through' }).faceSketch('top');
      const lug = path().circle(20, 0, 6);
      return (await face.union(lug)).extrude(2);
    `);
    // The face sketch is centred on the face: x −20..20, y −10..10, Ø8 hole.
    // Half of the R6 lug lies outside the right edge.
    expect(solid.volume()).toBeCloseTo((800 - 16 * Math.PI + 18 * Math.PI) * 2, 6);
  });

  it('revolves a boolean result: a turned pin with a groove', async () => {
    const { solid } = await lowerScript(`
      const blank = path().moveTo(0, 0).lineTo(5, 0).lineTo(5, 30).lineTo(0, 30).close();
      const groove = path().moveTo(4, 10).lineTo(6, 10).lineTo(6, 12).lineTo(4, 12).close();
      return (await blank.subtract(groove)).revolve();
    `);
    expect(solid.volume()).toBeCloseTo(Math.PI * 25 * 30 - Math.PI * (25 - 16) * 2, 6);
  });
});

describe('Sketch booleans — refusals', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  const run = (code: string) => runScript({ code, fileName: 'test.kcad.ts' });

  it('refuses a union of profiles that do not overlap', async () => {
    await expect(run(`return (await ${RECT}.union(${FAR_DISC})).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-boolean.split', message: expect.stringContaining('2 separate regions') });
  });

  it('refuses a union of profiles that touch at one point', async () => {
    await expect(run(`
      const corner = path().moveTo(40, 20).lineTo(50, 20).lineTo(50, 30).lineTo(40, 30).close();
      return (await ${RECT}.union(corner)).extrude(1);
    `)).rejects.toMatchObject({ code: 'feature.sketch-boolean.split' });
  });

  it('refuses a subtract that cuts the profile in two', async () => {
    await expect(run(`return (await ${RECT}.subtract(${BAR})).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-boolean.split' });
  });

  it('refuses a hole tangent to the outline: the result touches itself', async () => {
    await expect(run(`return (await ${RECT}.subtract(path().circle(35, 10, 5))).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-boolean.split', message: expect.stringContaining('touches itself at (40, 10)') });
    // 1 mm clear of the edge it is a valid hole.
    const { solid } = await lowerScript(`return (await ${RECT}.subtract(path().circle(34, 10, 5))).extrude(1);`);
    expect(solid.volume()).toBeCloseTo(800 - 25 * Math.PI, 6);
  });

  it('refuses a subtract that removes everything and an intersect with no overlap', async () => {
    await expect(run(`return (await ${INNER_DISC}.subtract(${RECT})).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-boolean.empty' });
    await expect(run(`return (await ${RECT}.intersect(${FAR_DISC})).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-boolean.empty' });
    // Profiles that share only an edge have no common area.
    await expect(run(`return (await ${RECT}.intersect(${NEIGHBOUR})).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.sketch-boolean.empty' });
  });

  it('rejects a non-Sketch operand and names the Shape method', async () => {
    await expect(run(`return (await ${RECT}.union(box(5, 5, 5))).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('Shape.union') });
    for (const arg of ['undefined', 'null', '5', '[]', `[${EDGE_DISC}, 5]`]) {
      await expect(run(`return (await ${RECT}.subtract(${arg})).extrude(1);`))
        .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('other') });
    }
  });

  it('rejects an un-awaited sketch operand', async () => {
    await expect(run(`return (await ${RECT}.union(${EDGE_DISC}.offset(1))).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('un-awaited') });
  });

  it('rejects a param()-driven profile on either side instead of freezing it', async () => {
    const driven = `path().moveTo(0, 0).lineTo(param('w', 40), 0).lineTo(40, 20).lineTo(0, 20).close()`;
    await expect(run(`return (await ${driven}.union(${EDGE_DISC})).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('param()') });
    await expect(run(`return (await ${EDGE_DISC}.union(${driven})).extrude(1);`))
      .rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('param()') });
  });

  it('rejects a spline profile', async () => {
    await expect(run(`
      const blob = path().moveTo(0, 0).lineTo(30, 0).smoothSpline(15, 20).smoothSpline(0, 0).close();
      return (await ${RECT}.intersect(blob)).extrude(1);
    `)).rejects.toMatchObject({ code: 'feature.invalid-args', message: expect.stringContaining('smoothSpline') });
  });

  it('names the missing await when a Sketch method is chained on the promise', async () => {
    await expect(run(`return ${RECT}.union(${EDGE_DISC}).extrude(1);`))
      .rejects.toMatchObject({
        code: 'feature.async-result.missing-await',
        message: expect.stringContaining('(await sketch.union(...)).extrude(...)'),
      });
  });
});
