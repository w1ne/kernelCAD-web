// tests/unit/dfm/fdmPrintability.test.ts
//
// FDM printability check — dfmSpec({ process: 'fdm' }). Capture validation
// plus analytic geometry, each run through the real evaluate seam
// (buildModel → runDfmChecksOnModel):
//   - a 60° overhang slope reports EXACTLY its face area unsupported; a 45°
//     slope (at the default limit) reports none,
//   - a Π bridge: 12 mm span > maxBridgeMm 10 → dfm.fdm.bridge-too-long with
//     the span; an 8 mm span is bridged and passes,
//   - a T cantilever is an overhang, never a bridge,
//   - a 0.5 mm fin fails a 0.4 mm nozzle (2 × nozzle = 0.8) and passes 0.2,
//   - a small hole and pin are flagged against 5× / 7.5× nozzle,
//   - a cone on its base vs on its tip: the orientation ranking flips (and
//     its 33.7° rim is a knife edge, not a thin wall),
//   - a r 1 bottom fillet prints in the first layers; a r 3 one does not,
//   - a sphere gets no rotation advice from tessellation noise,
//   - the report reaches verify({ check: 'dfm' }) and the CLI summary,
//   - a part larger than the bed fails, with the fitting rotation advised,
//   - a declared buildDirection is analyzed in that direction.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { DfmSpecMetadata } from '../../../src/shared/intent/dfmSpecRecord';
import { runDfmChecksOnModel, type DfmCheckReport } from '../../../src/modeling/runtime/dfm/runDfmChecks';
import type { FdmPartReport } from '../../../src/modeling/runtime/dfm/fdmCheck';
import { formatDfmSummary } from '../../../src/agent/cli/commands/dfm';
import { dfmCheckTool } from '../../../src/agent/mcp/tools/dfmCheck';

async function check(code: string): Promise<{ report: DfmCheckReport; fdm: FdmPartReport }> {
  const model = await buildModel({ fileName: 'fdm.kcad.ts', code });
  expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const report = await runDfmChecksOnModel(model);
  expect(report?.fdm).toHaveLength(1);
  for (const d of report!.diagnostics) expect(d.hint.trim().length).toBeGreaterThan(0);
  return { report: report!, fdm: report!.fdm![0].result };
}

const codes = (r: DfmCheckReport): string[] => r.diagnostics.map(d => d.code).sort();

/** Block whose +X side overhangs outward over a 5 mm rise at `deg` from
 *  vertical, 10 mm deep; built in XY and rotated so the profile stands in XZ
 *  with +Z (the default build direction) up. */
function slopeBlock(deg: number): string {
  return `
    dfmSpec({ process: 'fdm' });
    const a = 5 * Math.tan(${deg} * Math.PI / 180);
    return extrudePolygon([[0, 0], [10, 0], [10, 5], [10 + a, 10], [10 + a, 15], [0, 15]], 10).rotateX(90);
  `;
}

describe('dfmSpec process: fdm capture', () => {
  const meta = (spec: Parameters<ReturnType<typeof createApi>['dfmSpec']>[0]): DfmSpecMetadata => {
    const session = new CaptureSession();
    return createApi({ session }).dfmSpec(spec).metadata;
  };

  it('normalizes the FDM defaults when only the process is declared', () => {
    expect(meta({ process: 'fdm' }).fdm).toEqual({
      buildDirection: [0, 0, 1], nozzleMm: 0.4, maxOverhangDeg: 45, maxBridgeMm: 10, printer: 'generic-fdm',
    });
    expect(meta({ minWall: 1 }).fdm).toBeUndefined();
  });

  it('accepts axis tokens and normalizes vectors', () => {
    expect(meta({ process: 'fdm', buildDirection: '-y' }).fdm!.buildDirection).toEqual([0, -1, 0]);
    const v = meta({ process: 'fdm', buildDirection: [0, 3, 4] }).fdm!.buildDirection;
    expect(v[1]).toBeCloseTo(0.6, 12);
    expect(v[2]).toBeCloseTo(0.8, 12);
  });

  it.each([
    [{ nozzleMm: 0.4 }, /add process: 'fdm'/],
    [{ process: 'sla' }, /must be 'fdm'/],
    [{ process: 'fdm', buildDirection: 'up' }, /buildDirection/],
    [{ process: 'fdm', buildDirection: [0, 0, 0] }, /non-zero/],
    [{ process: 'fdm', maxOverhangDeg: 120 }, /\[0, 90\]/],
    [{ process: 'fdm', nozzleMm: 0 }, /positive/],
    [{ process: 'fdm', printer: 'mystery-printer' }, /generic-fdm/],
  ])('throws KernelError for %j', (spec, why) => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.dfmSpec(spec as never)).toThrow(KernelError);
    expect(() => api.dfmSpec(spec as never)).toThrow(why);
  });
});

describe('FDM printability check', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports a 60° overhang slope with its exact face area unsupported', async () => {
    const { report, fdm } = await check(slopeBlock(60));
    // Slope face: 10 mm deep × 5 / cos(60°) = 10 mm long.
    expect(fdm.orientation.unsupportedAreaMm2).toBeCloseTo(100, 6);
    const slope = fdm.orientation.overhangs.find(r => r.status === 'unsupported')!;
    expect(slope.maxOverhangDeg).toBeCloseTo(60, 6);
    expect(slope.reachMm).toBeCloseTo(5 * Math.tan(Math.PI / 3), 6);
    expect(slope.faceRef).toMatch(/^@kc\[extrude_1\/face\//);
    expect(codes(report)).toEqual(['dfm.fdm.overhang-unsupported']);
    const d = report.diagnostics[0];
    expect(d.severity).toBe('error');
    expect(d.message).toMatch(/100\.0 mm² of unsupported overhang/);
    expect(d.message).toMatch(/@kc\[extrude_1\/face\//);
    expect(fdm.verdict).toBe('fail');
  }, 60000);

  it('passes a 45° slope — at the default limit, self-supporting', async () => {
    const { report, fdm } = await check(slopeBlock(45));
    expect(fdm.orientation.unsupportedAreaMm2).toBe(0);
    expect(fdm.orientation.overhangs).toEqual([]);
    expect(report.diagnostics).toEqual([]);
    expect(fdm.verdict).toBe('pass');
  }, 60000);

  const piBridge = (span: number): string => `
    dfmSpec({ process: 'fdm' });
    const leftPost = box(5, 10, 10);
    const rightPost = box(5, 10, 10).translate(${5 + span}, 0, 0);
    const beam = box(${10 + span}, 10, 5).translate(0, 0, 10);
    return leftPost.union(rightPost).union(beam);
  `;

  it('flags a 12 mm bridge over maxBridgeMm 10 with its span', async () => {
    const { report, fdm } = await check(piBridge(12));
    const bridge = fdm.orientation.overhangs[0];
    expect(bridge.horizontal).toBe(true);
    expect(bridge.spanMm).toBeCloseTo(12, 6);
    expect(bridge.areaMm2).toBeCloseTo(120, 6);
    expect(bridge.status).toBe('unsupported');
    expect(codes(report)).toEqual(['dfm.fdm.bridge-too-long']);
    expect(report.diagnostics[0].message).toMatch(/bridges 12\.0 mm \(> maxBridgeMm 10 mm\)/);
  }, 60000);

  it('passes an 8 mm bridge anchored at both ends', async () => {
    const { report, fdm } = await check(piBridge(8));
    expect(fdm.orientation.overhangs).toHaveLength(1);
    expect(fdm.orientation.overhangs[0].status).toBe('bridged');
    expect(fdm.orientation.overhangs[0].spanMm).toBeCloseTo(8, 6);
    expect(fdm.orientation.unsupportedAreaMm2).toBe(0);
    expect(report.diagnostics).toEqual([]);
  }, 60000);

  const tee = `
    dfmSpec({ process: 'fdm' });
    const stem = box(4, 10, 20).translate(10, 0, 0);
    const bar = box(24, 10, 4).translate(0, 0, 20);
    return stem.union(bar);
  `;

  it('treats a T cantilever as an overhang, not a bridge, and advises lying it flat', async () => {
    const { report, fdm } = await check(tee);
    const arms = fdm.orientation.overhangs;
    expect(arms).toHaveLength(2);
    for (const arm of arms) {
      expect(arm.status).toBe('unsupported');
      expect(arm.spanMm).toBeUndefined();
      expect(arm.reachMm).toBeCloseTo(10, 6);
    }
    expect(fdm.orientation.unsupportedAreaMm2).toBeCloseTo(200, 6);
    expect(codes(report)).toEqual(['dfm.fdm.overhang-unsupported']);
    expect(fdm.ranking[0].label).toBe('+y');
    expect(fdm.ranking[0].unsupportedAreaMm2).toBe(0);
    expect(report.diagnostics[0].hint).toMatch(
      /Rotate 90° about X \(\.rotateX\(90\), or dfmSpec buildDirection: '\+y'\): unsupported area drops from 200\.0 to 0\.0 mm²\./,
    );
  }, 60000);

  it('surfaces the FDM block in verify dfm and the kernelcad dfm summary', async () => {
    const { report } = await check(tee);
    expect(formatDfmSummary(report)).toBe(
      "DFM: 1 parts, 0 clearance pairs, 0 wall clusters, 0 voids, fdm[shape] '+z' up 200.0 mm² unsupported " +
        "(best '+y' 0.0 mm²) — FAIL",
    );
    const tool = await dfmCheckTool({ code: tee });
    expect(tool.ok).toBe(false);
    expect(tool.fdm?.map(f => f.part)).toEqual(['shape']);
    expect(tool.fdm?.[0].result.ranking.map(r => r.label)).toHaveLength(6);
    expect((await dfmCheckTool({ code: 'dfmSpec({ minWall: 1 });\nreturn box(10, 10, 10);' })).fdm).toBeUndefined();
  }, 60000);

  it('treats a small bottom-edge fillet as first-layer, a large one as unsupported', async () => {
    const small = await check(`dfmSpec({ process: 'fdm' });\nreturn box(40, 30, 5).fillet(1);`);
    // Steep band of a r = 1 fillet rises r(1 - cos 45°) = 0.29 mm <= nozzle.
    expect(small.fdm.orientation.overhangs.map(r => r.status)).toEqual(['first-layer']);
    expect(small.report.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const large = await check(`dfmSpec({ process: 'fdm' });\nreturn box(40, 30, 10).fillet(3);`);
    // r = 3 rises 0.88 mm and reaches 3 sin 45° = 2.1 mm past the bed edge.
    const band = large.fdm.orientation.overhangs[0];
    expect(band.status).toBe('unsupported');
    expect(band.reachMm).toBeCloseTo(3 * Math.SQRT1_2, 1);
    expect(codes(large.report)).toEqual(['dfm.fdm.overhang-unsupported']);
  }, 60000);

  it('does not recommend a rotation that only shuffles tessellation noise (sphere)', async () => {
    const { report, fdm } = await check(`dfmSpec({ process: 'fdm' });\nreturn sphere(10);`);
    expect(fdm.ranking[0].label).toBe('+z');
    // Cap below 45°: 2πr · r(1 - cos 45°) = 184.0 mm², tessellated.
    expect(fdm.orientation.unsupportedAreaMm2).toBeCloseTo(2 * Math.PI * 100 * (1 - Math.SQRT1_2), -1);
    const overhang = report.diagnostics.find(d => d.code === 'dfm.fdm.overhang-unsupported')!;
    expect(overhang.hint).toMatch(/No axis-aligned orientation reduces the unsupported area/);
  }, 60000);

  const fin = (nozzle: number): string => `
    dfmSpec({ process: 'fdm', nozzleMm: ${nozzle} });
    return box(20, 20, 3).union(box(0.5, 20, 10).translate(10, 0, 3));
  `;

  it('flags a 0.5 mm fin under 2 × a 0.4 mm nozzle', async () => {
    const { report, fdm } = await check(fin(0.4));
    expect(fdm.walls.violations.length).toBeGreaterThan(0);
    expect(fdm.walls.violations[0].thicknessMm).toBeCloseTo(0.5, 3);
    expect(codes(report).filter(c => c === 'dfm.fdm.wall-below-nozzle').length).toBeGreaterThan(0);
    const d = report.diagnostics.find(x => x.code === 'dfm.fdm.wall-below-nozzle')!;
    expect(d.message).toMatch(/0\.500 mm wall .* below 2 × nozzle \(0\.80 mm for a 0\.4 mm nozzle\)/);
  }, 60000);

  it('passes the same fin with a 0.2 mm nozzle', async () => {
    const { report } = await check(fin(0.2));
    expect(codes(report)).not.toContain('dfm.fdm.wall-below-nozzle');
  }, 60000);

  it('flags holes under 5 × nozzle and pins under 7.5 × nozzle as warnings', async () => {
    const { report, fdm } = await check(`
      dfmSpec({ process: 'fdm' });
      const plate = box(30, 30, 4).subtract(cylinder(6, 0.75).translate(8, 8, -1));
      return plate.union(cylinder(6, 1).translate(20, 20, 4));
    `);
    expect(fdm.smallFeatures.map(f => [f.kind, f.diameterMm, f.minDiameterMm])).toEqual([
      ['hole', expect.closeTo(1.5, 9), expect.closeTo(2, 9)],
      ['pin', expect.closeTo(2, 9), expect.closeTo(3, 9)],
    ]);
    const small = report.diagnostics.filter(d => d.code === 'dfm.fdm.feature-too-small');
    expect(small.map(d => d.severity)).toEqual(['warn', 'warn']);
    expect(small[0].message).toMatch(/Ø1\.50 mm hole .* below the 2\.00 mm minimum/);
  }, 60000);

  const cone = (flip: boolean): string => `
    dfmSpec({ process: 'fdm' });
    const c = path().moveTo(0, 0).lineTo(15, 0).lineTo(0, 10).close().revolve();
    return ${flip ? 'c.rotateX(180)' : 'c'};
  `;

  it('ranks base-down first for a cone modeled on its base', async () => {
    const { report, fdm } = await check(cone(false));
    expect(fdm.ranking[0].label).toBe('+z');
    expect(fdm.ranking[0].unsupportedAreaMm2).toBe(0);
    expect(fdm.orientation.unsupportedAreaMm2).toBe(0);
    expect(fdm.orientation.bedContact.ratio).toBeGreaterThan(0.99);
    expect(report.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 60000);

  it('flips the ranking for the same cone modeled on its tip', async () => {
    const { report, fdm } = await check(cone(true));
    expect(fdm.ranking[0].label).toBe('-z');
    expect(fdm.ranking[0].rotation.apply).toBe('.rotateX(180)');
    // Lateral cone surface π·r·√(r² + h²) ≈ 849.5 mm², tessellated.
    expect(fdm.orientation.unsupportedAreaMm2).toBeGreaterThan(820);
    expect(fdm.orientation.unsupportedAreaMm2).toBeLessThan(850);
    expect(fdm.orientation.bedContactLow).toBe(true);
    expect(codes(report)).toEqual(['dfm.fdm.bed-contact-low', 'dfm.fdm.overhang-unsupported']);
    const overhang = report.diagnostics.find(d => d.code === 'dfm.fdm.overhang-unsupported')!;
    expect(overhang.hint).toMatch(/Rotate 180° about X \(\.rotateX\(180\), or dfmSpec buildDirection: '-z'\)/);
  }, 60000);

  it('fails a part larger than the bed and names the rotation that fits', async () => {
    const { report, fdm } = await check(`
      dfmSpec({ process: 'fdm' });
      return box(240, 40, 20);
    `);
    expect(fdm.orientation.fitsBed).toBe(false);
    const d = report.diagnostics.find(x => x.code === 'dfm.fdm.exceeds-bed')!;
    expect(d.severity).toBe('error');
    expect(d.message).toMatch(/240\.0 x 40\.0 x 20\.0 mm printing '\+z' up, larger than the 'generic-fdm' bed \(220 x 220 x 250 mm\)/);
    expect(d.hint).toMatch(/rotate -?90° about Y .* fits as 20\.0 x 40\.0 x 240\.0 mm/);
    expect(fdm.ranking[0].fitsBed).toBe(true);
  }, 60000);

  it('fails when no orientation fits the bed', async () => {
    const { report } = await check(`
      dfmSpec({ process: 'fdm' });
      return box(300, 260, 260);
    `);
    const d = report.diagnostics.find(x => x.code === 'dfm.fdm.exceeds-bed')!;
    expect(d.hint).toMatch(/No axis-aligned orientation fits this bed/);
  }, 60000);

  it('analyzes the declared build direction', async () => {
    const { report, fdm } = await check(`
      dfmSpec({ process: 'fdm', buildDirection: '+y' });
      const stem = box(4, 10, 20).translate(10, 0, 0);
      const bar = box(24, 10, 4).translate(0, 0, 20);
      return stem.union(bar);
    `);
    expect(fdm.orientation.label).toBe('+y');
    expect(fdm.orientation.rotation.apply).toBe('.rotateX(90)');
    expect(fdm.orientation.sizeMm).toEqual({ x: 24, y: 24, z: 10 });
    expect(fdm.orientation.unsupportedAreaMm2).toBe(0);
    expect(report.diagnostics).toEqual([]);
  }, 60000);
});
