// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Folded sheet-metal geometry: a bend replaces the flat flange with a folded
// one (inner radius, K-factor bend allowance, volume conserved), chained
// bends stay one solid, and holes drilled in the flat blank ride into the
// folded flange.
import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { detectCylindricalHoles } from '../../../../src/kernel/backends/occt/holeDetection';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { planFold, movingSide } from '../../../../src/modeling/sheetMetalFold';
import type { CompilerDiagnostic } from '../../../../src/shared/diagnostics/diagnostic';

async function lower(code: string) {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const r = await new RecomputeEngine(new OcctLowerer()).run(records);
  const last = records[records.length - 1];
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter(d => d.severity === 'error');
  return { shape: r.shapes.get(last.id) as OcctBackend | undefined, errors, records };
}

function solidCount(shape: OcctBackend): number {
  const oc = replicad.getOC() as any;
  const wrapped = (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
  const ex = new oc.TopExp_Explorer_2(wrapped, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  let n = 0;
  for (; ex.More(); ex.Next()) n++;
  ex.delete();
  return n;
}

function size(shape: OcctBackend): [number, number, number] {
  const bb = shape.boundingBox();
  return [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]];
}

const BLANK = 'path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close()';
// 90°, R3, t2, K0.38 → BA = π/2 · (3 + 0.76)
const BA_L = (Math.PI / 2) * (3 + 0.38 * 2);

describe('planFold (pure)', () => {
  const blank = { min: [0, 0] as [number, number], max: [100, 60] as [number, number], z0: 0, thickness: 2, kFactor: 0.4 };

  it('folds the shorter side of the blank (ties fold the + side)', () => {
    expect(movingSide({ orient: 'x', at: 50, angleDeg: 90, radius: 2 }, blank)).toBe(1);
    expect(movingSide({ orient: 'x', at: 20, angleDeg: 90, radius: 2 }, blank)).toBe(-1);
    expect(movingSide({ orient: 'x', at: 80, angleDeg: 90, radius: 2 }, blank)).toBe(1);
  });

  it('a lip on a folded flange splits only that flange cell', () => {
    const b = { min: [0, 0] as [number, number], max: [120, 40] as [number, number], z0: 0, thickness: 1.5, kFactor: 0.4 };
    const steps = planFold([
      { orient: 'x', at: 20, angleDeg: 90, radius: 2 },
      { orient: 'x', at: 100, angleDeg: 90, radius: 2 },
      { orient: 'x', at: 10, angleDeg: 90, radius: 2 },
    ], b);
    const half = steps[0].bendAllowance / 2;
    // The lip's cell is the left flange: blank edge .. bend-1 zone start.
    expect(steps[2].cell.min).toEqual([0, 0]);
    expect(steps[2].cell.max[0]).toBeCloseTo(20 - half, 9);
    expect(steps[2].cell.max[1]).toBe(40);
    expect(steps[2].reliefChecks).toEqual([]);
  });

  it('a crossing bend asks for corner relief where the two bends meet', () => {
    const b = { min: [0, 0] as [number, number], max: [100, 60] as [number, number], z0: 0, thickness: 1.5, kFactor: 0.4 };
    const steps = planFold([
      { orient: 'x', at: 85, angleDeg: 90, radius: 2 },
      { orient: 'y', at: 15, angleDeg: 90, radius: 2 },
    ], b);
    const half = steps[0].bendAllowance / 2;
    // Bend 2's cell stops at bend 1's zone start along X.
    expect(steps[1].cell.max[0]).toBeCloseTo(85 - half, 9);
    expect(steps[1].reliefChecks).toHaveLength(1);
    expect(steps[1].reliefChecks[0].crossing.at).toBe(85);
  });

  it('rejects overlapping bend zones', () => {
    expect(() => planFold([
      { orient: 'x', at: 50, angleDeg: 90, radius: 2 },
      { orient: 'x', at: 52, angleDeg: 90, radius: 2 },
    ], blank)).toThrow(/overlap/);
  });
});

describe('sheetMetalBend lowering — folded geometry', () => {
  beforeAll(async () => { await initOcct(); });

  it('L-bracket: the flange is folded, not kept flat (was 100 × 60 × 100, 17 880 mm³)', async () => {
    const { shape, errors } = await lower(`return sheetMetal(${BLANK}, { thickness: 2, kFactor: 0.38 }).bend({ atX: 50 }, 90, 3);`);
    expect(errors).toEqual([]);
    const [sx, sy, sz] = size(shape!);
    // Each leg: (50 − BA/2) flat + inner radius 3 + thickness 2.
    const leg = 50 - BA_L / 2 + 3 + 2;
    expect(sx).toBeCloseTo(leg, 2);
    expect(sy).toBeCloseTo(60, 3);
    expect(sz).toBeCloseTo(leg, 2);
    // Folded material ≈ blank (12 000 mm³); the arc differs from the BA strip
    // only by θ·(0.5 − K)·t²·w.
    expect(Math.abs(shape!.volume() - 12000) / 12000).toBeLessThan(0.01);
    expect(solidCount(shape!)).toBe(1);
  });

  it('a negative angle folds toward −Z with the inner radius below the sheet', async () => {
    const { shape, errors } = await lower(`return sheetMetal(${BLANK}, { thickness: 2, kFactor: 0.38 }).bend({ atX: 50 }, -90, 3);`);
    expect(errors).toEqual([]);
    const bb = shape!.boundingBox();
    expect(bb.max[2]).toBeCloseTo(2, 3);
    expect(bb.min[2]).toBeCloseTo(-(50 - BA_L / 2 + 3), 2);
  });

  it('U-channel (two bends) is ONE solid with the web in place', async () => {
    const { shape, errors } = await lower(`
      return sheetMetal(${BLANK}, { thickness: 2, kFactor: 0.4 })
        .bend({ atX: 25 }, 90, 2).bend({ atX: 75 }, 90, 2);`);
    expect(errors).toEqual([]);
    expect(solidCount(shape!)).toBe(1);
    const BA = (Math.PI / 2) * (2 + 0.8);
    const [sx, , sz] = size(shape!);
    // Web: 50 between the lines, minus one BA, plus the two outer bend corners.
    expect(sx).toBeCloseTo(50 - BA + 2 * (2 + 2), 2);
    expect(sz).toBeCloseTo(25 - BA / 2 + 2 + 2, 2);
    expect(Math.abs(shape!.volume() - 12000) / 12000).toBeLessThan(0.01);
  });

  it('Z-bracket (+90 then −90) is ONE solid spanning both sides of the web', async () => {
    const { shape, errors } = await lower(`
      return sheetMetal(${BLANK}, { thickness: 2, kFactor: 0.4 })
        .bend({ atX: 40 }, 90, 2).bend({ atX: 60 }, -90, 2);`);
    expect(errors).toEqual([]);
    expect(solidCount(shape!)).toBe(1);
    const bb = shape!.boundingBox();
    expect(bb.max[2]).toBeGreaterThan(35);
    expect(bb.min[2]).toBeLessThan(-35);
  });

  it('a blank with a hole can be bent; the hole lands in the folded flange', async () => {
    const { shape, errors } = await lower(`
      const sm = sheetMetal(${BLANK}, { thickness: 2, kFactor: 0.38 });
      // face frame origin is the blank centre (50, 30): hole at x = 80, y = 30
      return sm.hole({ byNormal: 'Z' }, { u: 30, v: 0, diameter: 6, depth: 'through' }).bend({ atX: 50 }, 90, 3);`);
    expect(errors).toEqual([]);
    expect(solidCount(shape!)).toBe(1);
    // Folded L without the hole: two flat legs of (50 − BA/2) plus the R3–R5 quarter annulus.
    const foldedL = 2 * (50 - BA_L / 2) * 60 * 2 + (Math.PI / 4) * (5 * 5 - 3 * 3) * 60;
    expect(shape!.volume()).toBeCloseTo(foldedL - Math.PI * 9 * 2, 1);
    const holes = detectCylindricalHoles(shape!);
    expect(holes).toHaveLength(1);
    const h = holes[0];
    expect(h.diameterMm).toBeCloseTo(6, 3);
    expect(Math.abs(h.axisDirection[0])).toBeCloseTo(1, 6); // horizontal bore through the vertical flange
    // Flat x = 80 sits 80 − (50 + BA/2) up the flange, which starts at z = 2 + 3.
    expect(h.axisOrigin[1]).toBeCloseTo(30, 3);
    const zFlange = 5 + (80 - (50 + BA_L / 2));
    // axisOrigin is on the axis; z is exact regardless of which end it reports.
    expect(h.axisOrigin[2]).toBeCloseTo(zFlange, 2);
  });

  it('a hole on the fixed side stays where it was drilled', async () => {
    const { shape, errors } = await lower(`
      const sm = sheetMetal(${BLANK}, { thickness: 2, kFactor: 0.38 });
      return sm.hole({ byNormal: 'Z' }, { u: -30, v: 10, diameter: 5, depth: 'through' }).bend({ atX: 50 }, 90, 3);`);
    expect(errors).toEqual([]);
    const holes = detectCylindricalHoles(shape!);
    expect(holes).toHaveLength(1);
    expect(holes[0].axisOrigin[0]).toBeCloseTo(20, 3);
    expect(holes[0].axisOrigin[1]).toBeCloseTo(40, 3);
    expect(Math.abs(holes[0].axisDirection[2])).toBeCloseTo(1, 6);
  });

  it('C-channel with lips (3 bends): one closed solid, volume conserved (was 2 solids, 6997 mm³)', async () => {
    const { shape, errors } = await lower(`
      return sheetMetal(path().moveTo(0, 0).lineTo(120, 0).lineTo(120, 40).lineTo(0, 40).close(), { thickness: 1.5, kFactor: 0.4 })
        .bend({ atX: 20 }, 90, 2).bend({ atX: 100 }, 90, 2).bend({ atX: 10 }, 90, 2);`);
    expect(errors).toEqual([]);
    expect(solidCount(shape!)).toBe(1);
    // Blank 7200 mm³ plus θ·(0.5 − K)·t²·w per bend.
    const perBend = (Math.PI / 2) * 0.1 * 1.5 * 1.5 * 40;
    expect(shape!.volume()).toBeCloseTo(7200 + 3 * perBend, 1);
    const bb = shape!.boundingBox();
    // The right flange keeps its full height; the lipped left flange is shorter.
    expect(bb.max[2]).toBeCloseTo(21.46, 1);
    expect(bb.min[0]).toBeCloseTo(18.54, 1);
    expect(bb.max[0]).toBeCloseTo(101.46, 1);
  });

  it('lips on both flanges (4 bends) stay one conserved solid', async () => {
    const { shape, errors } = await lower(`
      return sheetMetal(path().moveTo(0, 0).lineTo(120, 0).lineTo(120, 40).lineTo(0, 40).close(), { thickness: 1.5, kFactor: 0.4 })
        .bend({ atX: 20 }, 90, 2).bend({ atX: 100 }, 90, 2).bend({ atX: 10 }, 90, 2).bend({ atX: 110 }, 90, 2);`);
    expect(errors).toEqual([]);
    expect(solidCount(shape!)).toBe(1);
    const perBend = (Math.PI / 2) * 0.1 * 1.5 * 1.5 * 40;
    expect(shape!.volume()).toBeCloseTo(7200 + 4 * perBend, 1);
  });

  it('crossing atX / atY bends without corner relief fail with feature.sheetMetal.crossing-bends (was 845 mm³ lost silently)', async () => {
    const { shape, errors } = await lower(`
      return sheetMetal(${BLANK}, { thickness: 1.5, kFactor: 0.4 }).bend({ atX: 85 }, 90, 2).bend({ atY: 15 }, 90, 2);`);
    expect(errors.map(e => e.code)).toContain('feature.sheetMetal.crossing-bends');
    expect(errors.find(e => e.code === 'feature.sheetMetal.crossing-bends')?.hint).toMatch(/corner relief/);
    expect(shape).toBeUndefined();
  });

  it('crossing bends with a corner-relief notch fold into one conserved solid', async () => {
    const { shape, errors } = await lower(`
      const outline = path().moveTo(0, 0).lineTo(82, 0).lineTo(82, 18).lineTo(100, 18).lineTo(100, 60).lineTo(0, 60).close();
      return sheetMetal(outline, { thickness: 1.5, kFactor: 0.4 }).bend({ atX: 85 }, 90, 2).bend({ atY: 15 }, 90, 2);`);
    expect(errors).toEqual([]);
    expect(solidCount(shape!)).toBe(1);
    // (6000 − 18·18) mm² · 1.5, plus θ·(0.5 − K)·t² over each bend's length (42, 82).
    const delta = (Math.PI / 2) * 0.1 * 1.5 * 1.5 * (42 + 82);
    expect(shape!.volume()).toBeCloseTo(5676 * 1.5 + delta, 1);
  });

  it('lips folding into each other fail with feature.sheetMetal.fold-invalid, not a clean broken solid', async () => {
    const { shape, errors } = await lower(`
      return sheetMetal(path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 40).lineTo(0, 40).close(), { thickness: 1.5, kFactor: 0.4 })
        .bend({ atX: 30 }, 90, 2).bend({ atX: 70 }, 90, 2).bend({ atX: 22 }, 90, 2).bend({ atX: 78 }, 90, 2);`);
    expect(errors.map(e => e.code)).toContain('feature.sheetMetal.fold-invalid');
    expect(shape).toBeUndefined();
  });

  it('a bend line off the blank still says it does not cross the sheet', async () => {
    const { errors } = await lower(`
      return sheetMetal(path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close(), { thickness: 2, kFactor: 0.4 }).bend({ atX: 120 }, 90, 2);`);
    expect(errors.map(e => e.message).join('\n')).toMatch(/does not cross the sheet/);
  });

  it('overlapping bend zones fail with feature.invalid-args', async () => {
    const { errors } = await lower(`
      return sheetMetal(${BLANK}, { thickness: 2, kFactor: 0.4 }).bend({ atX: 70 }, 90, 2).bend({ atX: 72 }, 90, 2);`);
    expect(errors.map(e => e.code)).toContain('feature.invalid-args');
  });
});
