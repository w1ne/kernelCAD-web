// tests/unit/dfm/mouldingCheck.test.ts
//
// Injection-moulding check — dfmSpec({ process: 'moulding' }). Capture
// validation plus analytic geometry, each run through the real evaluate seam
// (buildModel → runDfmChecksOnModel). Every check has a part that violates it
// (the specific diagnostic fires, with the measured value) and a compliant
// part (it does not):
//   - draft: a 0.5° frustum fails minDraftDeg 1 on its four side faces at
//     exactly 0.5°; a 2° frustum passes; a revolved 1.5° boss reads 1.5°
//     from its exact surface normal (passes 1.5, fails 2),
//   - undercut: a cross hole along X pulled along Z is undercut over its whole
//     wall (2π·2·20 mm²); a vertical hole is not; the cross hole pulled along
//     X (pullDirection) is not,
//   - thin wall: a 0.6 mm plate fails minWallMm 1; a 2 mm plate passes,
//   - thick section: a 10 mm block exceeds maxWallMm 4 (measured ≈ 10); a
//     3 mm plate does not; a 0.05 mm sliver is reported UNMEASURED, not passed,
//   - sharp internal corner: an unfilleted L has a 90° radius-0 crease; an L
//     filleted at r 0.3 has a tight fillet; an L filleted at r 1 is clean (and
//     its B-spline vertex blends are not misread as undercuts),
//   - a fully compliant drafted plate produces no diagnostics at all,
//   - the report reaches the CLI summary and the requirements ledger.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { DfmSpecMetadata } from '../../../src/shared/intent/dfmSpecRecord';
import { findDfmSpec, runDfmChecksOnModel, type DfmCheckReport } from '../../../src/modeling/runtime/dfm/runDfmChecks';
import type { MouldingPartReport } from '../../../src/modeling/runtime/dfm/mouldingCheck';
import { formatDfmSummary } from '../../../src/agent/cli/commands/dfm';
import { dfmRequirementEntries } from '../../../src/modeling/requirements/dfmLedger';

async function check(code: string): Promise<{ report: DfmCheckReport; m: MouldingPartReport; spec: DfmSpecMetadata }> {
  const model = await buildModel({ fileName: 'moulding.kcad.ts', code });
  expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const report = await runDfmChecksOnModel(model);
  expect(report?.moulding).toHaveLength(1);
  for (const d of report!.diagnostics) expect(d.hint.trim().length).toBeGreaterThan(0);
  return { report: report!, m: report!.moulding![0].result, spec: findDfmSpec(model.records)! };
}

const withCode = (r: DfmCheckReport, code: string) => r.diagnostics.filter(d => d.code === code);

/** 20 × 20 × h block whose four side faces carry `deg` of draft for a +Z
 *  pull: the intersection of two trapezoid prisms, one tapering in X and one
 *  in Y. Planar faces, so the draft is exact. */
const frustum = (deg: number, h = 10, spec = "dfmSpec({ process: 'moulding' });"): string => `
  ${spec}
  const h = ${h}, a = h * Math.tan(${deg} * Math.PI / 180);
  const p = [[-10, 0], [10, 0], [10 - a, h], [-10 + a, h]];
  const sx = extrudePolygon(p, 40).rotateX(90).translate(0, 20, 0);
  const sy = extrudePolygon(p, 40).rotateX(90).translate(0, 20, 0).rotateZ(90);
  return sx.intersect(sy);
`;

/** Revolved round boss, radius 10 at the base, 10 tall, `deg` of draft on
 *  its conical side. */
const boss = (deg: number, minDraftDeg: number): string => `
  dfmSpec({ process: 'moulding', minDraftDeg: ${minDraftDeg}, maxWallMm: 30 });
  const a = 10 * Math.tan(${deg} * Math.PI / 180);
  return path().moveTo(0, 0).lineTo(10, 0).lineTo(10 - a, 10).lineTo(0, 10).close().revolve();
`;

/** 20 × 20 × 10 block with a Ø4 hole: along X (cross hole) or along Z. */
const holed = (axis: 'x' | 'z', pull = "'+z'"): string => `
  dfmSpec({ process: 'moulding', minDraftDeg: 0, maxWallMm: 30, pullDirection: ${pull} });
  const pin = ${axis === 'x'
    ? 'cylinder(100, 2).translate(0, 0, -50).rotateY(90).translate(10, 10, 5)'
    : 'cylinder(40, 2).translate(10, 10, -10)'};
  return box(20, 20, 10).subtract(pin);
`;

/** L-section: 20 × 10 × 3 base plate plus a 3 × 10 × 20 upright. */
const lSection = (fillet?: number): string => `
  dfmSpec({ process: 'moulding', minDraftDeg: 0 });
  const l = box(20, 10, 3).union(box(3, 10, 20));
  return ${fillet === undefined ? 'l' : `l.fillet(${fillet})`};
`;

const plate = (t: number, extra = ''): string => `
  dfmSpec({ process: 'moulding', minDraftDeg: 0${extra} });
  return box(30, 30, ${t});
`;

describe('dfmSpec process: moulding capture', () => {
  const meta = (spec: Parameters<ReturnType<typeof createModelingApi>['dfmSpec']>[0]): DfmSpecMetadata => {
    const session = new CaptureSession();
    return createModelingApi({ session }).dfmSpec(spec).metadata;
  };

  it('normalizes the moulding defaults when only the process is declared', () => {
    const m = meta({ process: 'moulding' });
    expect(m.moulding).toEqual({
      pullDirection: [0, 0, 1], minDraftDeg: 1, minWallMm: 1, maxWallMm: 4, minRadiusMm: 0.5,
    });
    expect(m.fdm).toBeUndefined();
    expect(meta({ process: 'fdm' }).moulding).toBeUndefined();
  });

  it('accepts pull-direction axis tokens and normalizes vectors', () => {
    expect(meta({ process: 'moulding', pullDirection: '-x' }).moulding!.pullDirection).toEqual([-1, 0, 0]);
    const v = meta({ process: 'moulding', pullDirection: [3, 0, 4] }).moulding!.pullDirection;
    expect(v[0]).toBeCloseTo(0.6, 12);
    expect(v[2]).toBeCloseTo(0.8, 12);
  });

  it.each([
    [{ minDraftDeg: 1 }, /add process: 'moulding'/],
    [{ process: 'fdm', maxWallMm: 3 }, /add process: 'moulding'/],
    [{ process: 'moulding', nozzleMm: 0.4 }, /add process: 'fdm'/],
    [{ process: 'sla' }, /must be 'fdm' or 'moulding'/],
    [{ process: 'moulding', pullDirection: 'up' }, /pullDirection/],
    [{ process: 'moulding', pullDirection: [0, 0, 0] }, /non-zero/],
    [{ process: 'moulding', minDraftDeg: 90 }, /\[0, 90\)/],
    [{ process: 'moulding', minWallMm: 0 }, /positive/],
    [{ process: 'moulding', minWallMm: 3, maxWallMm: 2 }, /greater than minWallMm/],
    [{ process: 'moulding', minRadiusMm: -1 }, /positive/],
  ])('throws KernelError for %j', (spec, why) => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    expect(() => api.dfmSpec(spec as never)).toThrow(KernelError);
    expect(() => api.dfmSpec(spec as never)).toThrow(why);
  });
});

describe('injection-moulding check', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  // --- 1. Draft ----------------------------------------------------------------

  it('flags each side face of a 0.5° frustum at its measured 0.5° draft', async () => {
    const { report, m } = await check(frustum(0.5));
    const draft = withCode(report, 'dfm.moulding.draft-insufficient');
    expect(draft).toHaveLength(4);
    expect(m.draft.checkedFaces).toBe(4); // top and bottom are parting faces
    for (const f of m.draft.insufficient) {
      expect(f.draftDeg).toBeCloseTo(0.5, 6);
      expect(f.faceRef).toMatch(/^@kc\[boolean_1\/face\//);
      expect(f.straddlesParting).toBe(false);
    }
    expect(draft[0].severity).toBe('error');
    expect(draft[0].message).toMatch(/has 0\.50° draft \(< minDraftDeg 1°, pull \[0, 0, 1\]\)/);
    expect(draft[0].hint).toMatch(/shape\.draft/);
    expect(m.verdict).toBe('fail');
  }, 60000);

  it('passes a 2° frustum on draft', async () => {
    const { report, m } = await check(frustum(2));
    expect(withCode(report, 'dfm.moulding.draft-insufficient')).toEqual([]);
    expect(m.draft.insufficient).toEqual([]);
    expect(m.draft.minDraftDeg).toBeCloseTo(2, 6);
  }, 60000);

  it('measures a curved (conical) face from its exact normal, not its chord facets', async () => {
    const ok = await check(boss(1.5, 1.5));
    expect(ok.m.draft.minDraftDeg).toBeCloseTo(1.5, 4);
    expect(withCode(ok.report, 'dfm.moulding.draft-insufficient')).toEqual([]);
    const bad = await check(boss(1.5, 2));
    const d = withCode(bad.report, 'dfm.moulding.draft-insufficient');
    expect(d).toHaveLength(1);
    expect(bad.m.draft.insufficient[0].draftDeg).toBeCloseTo(1.5, 4);
  }, 60000);

  // --- 2. Undercut -------------------------------------------------------------

  it('reports a cross hole as an undercut over its whole wall when pulled along Z', async () => {
    const { report, m } = await check(holed('x'));
    const u = withCode(report, 'dfm.moulding.undercut');
    expect(u).toHaveLength(1);
    expect(u[0].severity).toBe('error');
    // Tessellated Ø4 × 20 bore wall: 2π·2·20 = 251.3 mm² (chords sit inside).
    expect(m.undercut.areaMm2).toBeGreaterThan(248);
    expect(m.undercut.areaMm2).toBeLessThanOrEqual(2 * Math.PI * 2 * 20 + 1e-6);
    expect(m.undercut.faces[0].faceRef).toMatch(/^@kc\[boolean_1\/face\//);
    expect(u[0].message).toMatch(/mm² of undercut at .* release along ±\[0, 0, 1\]/);
    expect(m.verdict).toBe('fail');
  }, 60000);

  it('finds no undercut on a vertical hole pulled along Z', async () => {
    const { report, m } = await check(holed('z'));
    expect(withCode(report, 'dfm.moulding.undercut')).toEqual([]);
    expect(m.undercut).toEqual({ areaMm2: 0, faces: [] });
  }, 60000);

  it('honours pullDirection: the cross hole pulled along X is not an undercut', async () => {
    const { report, m } = await check(holed('x', "'+x'"));
    expect(m.settings.pullDirection).toEqual([1, 0, 0]);
    expect(withCode(report, 'dfm.moulding.undercut')).toEqual([]);
    expect(m.undercut.areaMm2).toBe(0);
  }, 60000);

  // --- 3. Thin wall ------------------------------------------------------------

  it('flags a 0.6 mm plate below minWallMm 1', async () => {
    const { report, m } = await check(plate(0.6));
    const w = withCode(report, 'dfm.moulding.thin-wall');
    expect(w.length).toBeGreaterThanOrEqual(1);
    expect(w[0].severity).toBe('error');
    expect(m.walls.thinnestMm).toBeCloseTo(0.6, 3);
    expect(w[0].message).toMatch(/has a 0\.600 mm wall .*\(< minWallMm 1 mm\)/);
  }, 60000);

  it('passes a 2 mm plate on wall thickness', async () => {
    const { report, m } = await check(plate(2));
    expect(withCode(report, 'dfm.moulding.thin-wall')).toEqual([]);
    expect(m.walls.thinnestMm).toBeCloseTo(2, 3);
  }, 60000);

  // --- 4. Thick section (sink / warp) ------------------------------------------

  it('flags a 10 mm block above maxWallMm 4 with its measured section', async () => {
    const { report, m } = await check(plate(10));
    const t = withCode(report, 'dfm.moulding.thick-wall');
    expect(t).toHaveLength(1);
    expect(t[0].severity).toBe('warn');
    // Lower bound on the true 10 mm inscribed diameter, within one voxel.
    expect(m.thickest!.thicknessMm).toBeLessThanOrEqual(10 + 1e-6);
    expect(m.thickest!.thicknessMm).toBeGreaterThan(10 - m.thickest!.voxelMm);
    expect(m.thickest!.location[2]).toBeCloseTo(5, 1);
    expect(t[0].message).toMatch(/thick section .* above maxWallMm 4 mm/);
  }, 60000);

  it('does not flag a 3 mm plate', async () => {
    const { report, m } = await check(plate(3));
    expect(withCode(report, 'dfm.moulding.thick-wall')).toEqual([]);
    expect(m.thickest!.thicknessMm).toBeLessThanOrEqual(3 + 1e-6);
    expect(m.thickest!.thicknessMm).toBeGreaterThan(3 - m.thickest!.voxelMm);
  }, 60000);

  it('reports a section too thin to voxelize as UNMEASURED, not as a pass', async () => {
    const { report, m } = await check(plate(0.05));
    expect(m.thickest).toBeNull();
    expect(m.unmeasured).toEqual([expect.stringMatching(/^thickest section/)]);
    const u = withCode(report, 'dfm.moulding.unmeasured');
    expect(u).toHaveLength(1);
    expect(u[0].message).toMatch(/unknown, not a pass/);
  }, 60000);

  // --- 5. Sharp internal corners -----------------------------------------------

  it('flags the radius-0 inside corner of an unfilleted L', async () => {
    const { report, m } = await check(lSection());
    const c = withCode(report, 'dfm.moulding.sharp-corner');
    expect(c).toHaveLength(1);
    expect(c[0].severity).toBe('warn');
    expect(m.sharpCorners).toHaveLength(1);
    expect(m.sharpCorners[0]).toMatchObject({ kind: 'crease', radiusMm: 0 });
    expect(m.sharpCorners[0].turnDeg).toBeCloseTo(90, 6);
    expect(m.sharpCorners[0].lengthMm).toBeCloseTo(10, 6);
    expect(m.sharpCorners[0].location).toEqual([3, 5, 3]);
  }, 60000);

  it('flags an r 0.3 inside fillet below minRadiusMm 0.5', async () => {
    const { report, m } = await check(lSection(0.3));
    const c = withCode(report, 'dfm.moulding.sharp-corner');
    expect(c).toHaveLength(1);
    expect(m.sharpCorners[0].kind).toBe('tight-fillet');
    expect(m.sharpCorners[0].radiusMm).toBeCloseTo(0.3, 6);
    expect(c[0].message).toMatch(/internal fillet of radius 0\.30 mm/);
  }, 60000);

  it('passes an r 1 inside fillet, and does not misread its blends as undercuts', async () => {
    const { report, m } = await check(lSection(1));
    expect(withCode(report, 'dfm.moulding.sharp-corner')).toEqual([]);
    expect(m.sharpCorners).toEqual([]);
    expect(withCode(report, 'dfm.moulding.undercut')).toEqual([]);
  }, 60000);

  // --- Whole gate ----------------------------------------------------------------

  it('passes a drafted 3 mm plate with no diagnostics at all', async () => {
    const { report, m } = await check(frustum(2, 3));
    expect(report.diagnostics).toEqual([]);
    expect(m.verdict).toBe('pass');
    expect(m.unmeasured).toEqual([]);
    expect(m.limitations.length).toBeGreaterThan(0);
  }, 60000);

  it('reaches the CLI summary and the requirements ledger', async () => {
    const { report, spec } = await check(frustum(0.5, 3));
    expect(formatDfmSummary(report)).toMatch(
      /moulding\[shape\] draft min 0\.50° \(4 faces < 1°\), undercut 0\.0 mm², wall 3\.000–\d\.\d\d mm, 0 sharp corner\(s\) — FAIL$/,
    );
    const ledger = dfmRequirementEntries(report, spec).filter(e => e.name.startsWith('dfm.moulding.'));
    expect(ledger.map(e => [e.name, e.status])).toEqual([
      ['dfm.moulding.shape.draft', 'fail'],
      ['dfm.moulding.shape.undercut', 'pass'],
      ['dfm.moulding.shape.minWall', 'pass'],
      ['dfm.moulding.shape.maxWall', 'pass'],
    ]);
    expect(ledger[0].measured).toBeCloseTo(0.5, 6);
  }, 60000);
});
