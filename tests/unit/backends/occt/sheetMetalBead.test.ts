// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/backends/occt/sheetMetalBead.test.ts

import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { flattenPatternWithHoles } from '../../../../src/modeling/sheetMetalFlatPattern';
import { flattenPatternTool } from '../../../../src/agent/mcp/tools/flattenPattern';
import type { CompilerDiagnostic } from '../../../../src/shared/diagnostics/diagnostic';
import type { BeadProfile, BeadSide } from '../../../../src/shared/intent/region';

type Oc = any;

async function lowerScript(code: string) {
  const { records, paramTable } = await runScript({ code, fileName: 'bead-test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records, { paramTable });
  const last = records[records.length - 1];
  const shape = r.shapes.get(last.id) as OcctBackend | undefined;
  return { shape, diagnostics: r.diagnostics as CompilerDiagnostic[], records, shapes: r.shapes, paramTable };
}

function assertSingleValidClosedSolid(shape: OcctBackend): number {
  const oc: Oc = replicad.getOC();
  const rep = shape.getReplicadShape();
  const wrapped = (rep as unknown as { wrapped: unknown }).wrapped;
  const exp = new oc.TopExp_Explorer_2(
    wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let solids = 0;
  while (exp.More()) {
    solids++;
    exp.Next();
  }
  exp.delete();
  expect(solids).toBe(1);

  const analyzer = new oc.BRepCheck_Analyzer(wrapped, true, false);
  const valid = Boolean(analyzer.IsValid_2());
  analyzer.delete();
  expect(valid).toBe(true);

  const vol = shape.volume();
  expect(vol).toBeGreaterThan(0);
  return vol;
}

/** Intersect `shape` with an axis-aligned probe box and return shared volume (mm^3). */
function probeBoxVolume(
  shape: OcctBackend,
  min: [number, number, number],
  max: [number, number, number],
): number {
  const oc: Oc = replicad.getOC();
  const a = new oc.gp_Pnt_3(...min);
  const b = new oc.gp_Pnt_3(...max);
  const boxMaker = new oc.BRepPrimAPI_MakeBox_4(a, b);
  const boxShape = boxMaker.Shape();
  const progress = new oc.Message_ProgressRange_1();
  const wrapped = (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
  const common = new oc.BRepAlgoAPI_Common_3(wrapped, boxShape, progress);
  const out = common.Shape();
  const props = new oc.GProp_GProps_1();
  oc.BRepGProp.VolumeProperties_1(out, props, true, false, false);
  const vol = Math.abs(props.Mass());
  props.delete();
  common.delete();
  progress.delete();
  boxMaker.delete();
  a.delete();
  b.delete();
  return vol;
}

describe('sheetMetalBead OCCT B-rep lowering', () => {
  beforeAll(async () => { await initOcct(); });

  const profiles: BeadProfile[] = ['round', 'u', 'v'];
  const sides: BeadSide[] = ['top', 'bottom'];

  for (const profile of profiles) {
    for (const side of sides) {
      it(`forms valid recessed bead: profile='${profile}', side='${side}'`, async () => {
        const thickness = 1.5;
        const height = 2.0;
        const code = `
          const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
          const blank = sheetMetal(s, { thickness: ${thickness}, kFactor: 0.4 });
          return blank.bead({
            from: [20, 30],
            to: [80, 30],
            width: 8,
            height: ${height},
            profile: '${profile}',
            side: '${side}',
          });
        `;
        const { shape, diagnostics } = await lowerScript(code);
        expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        expect(shape).toBeDefined();

        assertSingleValidClosedSolid(shape!);
        const bb = shape!.boundingBox();
        if (side === 'top') {
          expect(bb.min[2]).toBeCloseTo(0, 2);
          expect(bb.max[2]).toBeCloseTo(thickness + height, 2);
          // Opposite face (bottom, z=0..0.4 at bead midpoint) must be recessed (empty).
          expect(probeBoxVolume(shape!, [49.5, 29.5, 0.05], [50.5, 30.5, 0.45])).toBeLessThan(1e-3);
          // Raised ridge crown above sheet (z=thickness+0.5..thickness+1.2) must contain solid.
          expect(probeBoxVolume(shape!, [49.5, 29.5, thickness + 0.3], [50.5, 30.5, thickness + 1.0])).toBeGreaterThan(0.1);
        } else {
          expect(bb.min[2]).toBeCloseTo(-height, 2);
          expect(bb.max[2]).toBeCloseTo(thickness, 2);
          // Opposite face (top, z=thickness-0.45..thickness-0.05) must be recessed (empty).
          expect(probeBoxVolume(shape!, [49.5, 29.5, thickness - 0.45], [50.5, 30.5, thickness - 0.05])).toBeLessThan(1e-3);
          // Raised ridge crown below sheet (z=-1.0..-0.3) must contain solid.
          expect(probeBoxVolume(shape!, [49.5, 29.5, -1.0], [50.5, 30.5, -0.3])).toBeGreaterThan(0.1);
        }
      });
    }
  }

  it('forms a clean solid emboss without opposite-face recess when width <= 2 * thickness', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 2, kFactor: 0.4 });
      return blank.bead({ from: [20, 30], to: [80, 30], width: 3.5, height: 1.5, profile: 'round', side: 'top' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const vol = assertSingleValidClosedSolid(shape!);
    // Solid emboss strictly adds volume on top of the 100x60x2 = 12000 mm^3 blank.
    expect(vol).toBeGreaterThan(12000);
    // Opposite face stays solid (no cut recess).
    expect(probeBoxVolume(shape!, [49.5, 29.5, 0.1], [50.5, 30.5, 0.9])).toBeCloseTo(0.8, 2);
  });

  it('supports multiple parallel beads and folds a flange bead cleanly via .bend()', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(120, 0).lineTo(120, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 1.5, kFactor: 0.4 });
      return blank
        .bead({ from: [15, 20], to: [45, 20], width: 8, height: 2, profile: 'round', side: 'top' })
        .bead({ from: [15, 40], to: [45, 40], width: 8, height: 2, profile: 'u', side: 'top' })
        .bead({ from: [82, 15], to: [108, 15], width: 8, height: 2, profile: 'round', side: 'top' })
        .bead({ from: [82, 45], to: [108, 45], width: 8, height: 2, profile: 'v', side: 'bottom' })
        .bend({ atX: 65 }, 90, 2);
    `;
    const { shape, diagnostics, records, shapes, paramTable } = await lowerScript(code);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    assertSingleValidClosedSolid(shape!);

    const bb = shape!.boundingBox();
    // Bent L-bracket height rises along +Z (~50+ mm) and fixed web beads stay above z = thickness.
    expect(bb.max[2]).toBeGreaterThan(45);
    // Fixed-web bead crown at (30, 20, z=2.0..2.8) survived the bend.
    expect(probeBoxVolume(shape!, [29.5, 19.5, 2.0], [30.5, 20.5, 2.8])).toBeGreaterThan(0.1);
    // Flange bottom-bead (-Z in flat -> +X past the upright flange outer wall after 90-deg +Z fold).
    const ba = (Math.PI / 2) * (0.4 * 1.5 + 2);
    const zoneStart = 65 - ba / 2;
    const uprightOuterX = zoneStart + 2 + 1.5;
    expect(bb.max[0]).toBeCloseTo(uprightOuterX + 2.0, 2);

    // Flat pattern carries all 4 beads without breaking outer / bendLines / holes.
    const flat = await flattenPatternWithHoles(records, undefined, shapes, paramTable);
    expect(flat.outer.length).toBe(4);
    expect(flat.bendLines.length).toBe(1);
    expect(flat.holes).toEqual([]);
    expect(flat.beads).toHaveLength(4);
    expect(flat.beads![0]).toEqual({
      start: [15, 20],
      end: [45, 20],
      width: 8,
      height: 2,
      profile: 'round',
      side: 'top',
    });
    expect(flat.beads![3]).toEqual({
      start: [82, 45],
      end: [108, 45],
      width: 8,
      height: 2,
      profile: 'v',
      side: 'bottom',
    });
  });

  it('preserves real holes and excludes bead seams in flattenPattern() + MCP flatten_pattern', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      const blank = sheetMetal(s, { thickness: 1.5, kFactor: 0.4 });
      return blank
        .hole('top', { u: -30, v: 0, diameter: 6, depth: 'through' })
        .bead({ from: [40, 30], to: [85, 30], width: 8, height: 2, profile: 'u', side: 'top' });
    `;
    const mcpRes = await flattenPatternTool({ code });
    expect(mcpRes.ok).toBe(true);
    expect(mcpRes.region?.outer.length).toBe(4);
    expect(mcpRes.region?.holes.length).toBe(1);
    expect(mcpRes.region?.beads).toEqual([
      { start: [40, 30], end: [85, 30], width: 8, height: 2, profile: 'u', side: 'top' },
    ]);

    // Backwards compatibility: sheet without beads omits `beads` key.
    const noBeadRes = await flattenPatternTool({
      code: `
        const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
        return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 }).bend({ atX: 50 }, 90, 2);
      `,
    });
    expect(noBeadRes.ok).toBe(true);
    expect(noBeadRes.region?.beads).toBeUndefined();
  });

  it('emits typed diagnostics for non-sheet-metal, out-of-bounds, and bend-zone crossing', async () => {
    // 1. Non-sheet-metal shape
    const nonSm = await lowerScript(`
      return box(60, 40, 2).bead({ from: [10, 20], to: [50, 20], width: 6, height: 2 });
    `);
    expect(nonSm.diagnostics.some((d) => d.code === 'feature.invalid-args')).toBe(true);

    // 2. Zero-length segment fails at capture with KernelError('feature.invalid-args')
    await expect(lowerScript(`
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
        .bead({ from: [40, 30], to: [40, 30], width: 8, height: 2 });
    `)).rejects.toThrow(/zero-length/i);

    // 3. Bead footprint extending outside blank
    const oob = await lowerScript(`
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
        .bead({ from: [2, 30], to: [60, 30], width: 8, height: 2 });
    `);
    expect(oob.diagnostics.some((d) => d.code === 'feature.sheetMetal.bead-out-of-bounds')).toBe(true);

    // 4. Bead crossing a subsequent bend zone
    const crossPre = await lowerScript(`
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
        .bead({ from: [30, 30], to: [70, 30], width: 8, height: 2 })
        .bend({ atX: 50 }, 90, 2);
    `);
    expect(crossPre.diagnostics.some((d) => d.code === 'feature.sheetMetal.bead-crosses-bend')).toBe(true);

    // 5. Post-bend bead crossing an existing bend zone
    const crossPost = await lowerScript(`
      const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: 1.5, kFactor: 0.4 })
        .bend({ atX: 50 }, 90, 2)
        .bead({ from: [30, 30], to: [70, 30], width: 8, height: 2 });
    `);
    expect(crossPost.diagnostics.some((d) => d.code === 'feature.sheetMetal.bead-crosses-bend')).toBe(true);
  });

  it('lowers parametric .bead() (param() width/height/from/to on parametric sheetMetal + bend)', async () => {
    const preBendCode = `
      const t = param('Thick', 1.5);
      const k = param('KF', 0.4);
      const bx = param('BendX', 60);
      const ang = param('Angle', 90);
      const rad = param('Radius', 2);
      const x0 = param('BeadX0', 15);
      const x1 = param('BeadX1', 45);
      const y = param('BeadY', 30);
      const w = param('BeadW', 8);
      const h = param('BeadH', 2);
      const s = path().moveTo(0, 0).lineTo(120, 0).lineTo(120, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: t, kFactor: k })
        .bead({ from: [x0, y], to: [x1, y], width: w, height: h, profile: 'round', side: 'top' })
        .bend({ atX: bx }, ang, rad);
    `;
    const { shape, diagnostics, records, shapes, paramTable } = await lowerScript(preBendCode);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const vol1 = assertSingleValidClosedSolid(shape!);

    const flat = await flattenPatternWithHoles(records, undefined, shapes, paramTable);
    expect(flat.beads).toEqual([
      { start: [15, 30], end: [45, 30], width: 8, height: 2, profile: 'round', side: 'top' },
    ]);

    // Updating bead height + width through paramTable changes lowered geometry and flat pattern.
    paramTable.set('BeadW', 10);
    paramTable.set('BeadH', 3);
    const engine = new RecomputeEngine(new OcctLowerer());
    const rerun = await engine.run(records, { paramTable });
    expect(rerun.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const updatedShape = rerun.shapes.get(records[records.length - 1]!.id) as OcctBackend;
    const vol2 = assertSingleValidClosedSolid(updatedShape);
    expect(vol2).not.toBeCloseTo(vol1, 1);

    const flat2 = await flattenPatternWithHoles(records, undefined, rerun.shapes, paramTable);
    expect(flat2.beads).toEqual([
      { start: [15, 30], end: [45, 30], width: 10, height: 3, profile: 'round', side: 'top' },
    ]);

    // Post-bend parametric bead on a bent parametric sheet also lowers cleanly.
    const postBend = await lowerScript(`
      const t = param('Thick', 1.5);
      const k = param('KF', 0.4);
      const bx = param('BendX', 60);
      const ang = param('Angle', 90);
      const rad = param('Radius', 2);
      const x0 = param('BeadX0', 80);
      const x1 = param('BeadX1', 105);
      const y = param('BeadY', 30);
      const w = param('BeadW', 8);
      const h = param('BeadH', 2);
      const s = path().moveTo(0, 0).lineTo(120, 0).lineTo(120, 60).lineTo(0, 60).close();
      return sheetMetal(s, { thickness: t, kFactor: k })
        .bend({ atX: bx }, ang, rad)
        .bead({ from: [x0, y], to: [x1, y], width: w, height: h, profile: 'u', side: 'top' });
    `);
    expect(postBend.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(postBend.shape).toBeDefined();
    assertSingleValidClosedSolid(postBend.shape!);
  });
});
