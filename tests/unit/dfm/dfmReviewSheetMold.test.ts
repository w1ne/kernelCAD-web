// tests/unit/dfm/dfmReviewSheetMold.test.ts
//
// dfm_review processes 'sheet-metal' and 'injection-molding', plus the CNC
// corner false positives (blind side-hole floor, closed pocket floor seen
// from a side setup) and the fdm.min-hole diagnostic severity.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { dfmReviewTool, type DfmReviewOutput } from '../../../src/agent/mcp/tools/dfmReview';
import { analyzeSheetMetalFlat, SHEET_METAL_DEFAULTS } from '../../../src/modeling/runtime/dfm/sheetMetalCheck';

const check = (r: DfmReviewOutput, id: string) => r.checks.find(c => c.id === id);
const status = (r: DfmReviewOutput, id: string): string | undefined => check(r, id)?.status;

/** 80 × 40 × 2 mm blank, one Ø4 hole at blank (40 + holeU, 20 + holeV), one 90° bend at x = bendX. */
const sheet = (o: { radius: number; holeU: number; holeV?: number; bendX?: number }): string => `
const s = path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close();
let b = sheetMetal(s, { thickness: 2, kFactor: 0.4 });
b = b.hole({ byNormal: 'Z' }, { u: ${o.holeU}, v: ${o.holeV ?? 0}, diameter: 4, depth: 'through' });
b = b.bend({ atX: ${o.bendX ?? 60} }, 90, ${o.radius});
return b;`;

const DRAFTED = "let b = box(40, 30, 3); for (const f of ['front', 'back', 'left', 'right']) b = b.draft(2, { face: f, neutralPlane: 'bottom', pullDir: [0, 0, 1] }); return b;";
/** A boss on a plate with a slot cut through it along X: the slot's ceiling and floor face ±z behind material. */
const SIDE_SLOT = 'return box(30, 20, 3).union(box(10, 20, 10).translate(10, 0, 3)).subtract(box(30, 4, 3).translate(0, 8, 6));';

describe('dfm_review sheet-metal', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('fails a too-tight bend and a hole too close to the bend, with flat-pattern locations', async () => {
    const r = await dfmReviewTool({ code: sheet({ radius: 1, holeU: 16 }), processes: ['sheet-metal'] });
    expect(r.ok).toBe(true);
    expect(r.checks.map(c => c.id)).toEqual(['sheet.min-bend-radius', 'sheet.hole-to-bend', 'sheet.hole-to-edge', 'sheet.min-flange']);
    expect(status(r, 'sheet.min-bend-radius')).toBe('fail');
    expect(check(r, 'sheet.min-bend-radius')).toMatchObject({ value: 1, limit: 2 });
    expect(status(r, 'sheet.hole-to-bend')).toBe('fail');
    // Hole edge at x = 58, bend line at x = 60; limit 2.5 × 2 + R1 = 6 mm.
    expect(check(r, 'sheet.hole-to-bend')).toMatchObject({ value: 2, limit: 6 });
    expect(status(r, 'sheet.hole-to-edge')).toBe('pass');
    expect(status(r, 'sheet.min-flange')).toBe('pass');
    expect(r.verdict).toBe('fail');
    const rep = r.sheetMetal![0].result;
    expect(rep.thicknessMm).toBe(2);
    expect(rep.bends[0].featureId).toMatch(/^sheetMetalBend/);
    expect(rep.holeToBend[0].location[0]).toBeCloseTo(58, 1);
    expect(rep.holeToBend[0].location[1]).toBeCloseTo(20, 1);
  }, 120000);

  it('passes the same part with R = t and the hole moved away', async () => {
    const r = await dfmReviewTool({ code: sheet({ radius: 2, holeU: 0 }), processes: ['sheet-metal'] });
    expect(r.checks.filter(c => c.status !== 'pass')).toEqual([]);
    expect(r.verdict).toBe('pass');
  }, 120000);

  it('fails a hole near the blank edge and a flange shorter than 4 × t', async () => {
    const r = await dfmReviewTool({ code: sheet({ radius: 2, holeU: -20, holeV: 17, bendX: 76 }), processes: ['sheet-metal'] });
    expect(status(r, 'sheet.hole-to-edge')).toBe('fail');
    expect(check(r, 'sheet.hole-to-edge')?.value).toBeCloseTo(1, 1);
    expect(status(r, 'sheet.min-flange')).toBe('fail');
    expect(check(r, 'sheet.min-flange')?.limit).toBe(8);
    // Looser call options pass both.
    const loose = await dfmReviewTool({
      code: sheet({ radius: 2, holeU: -20, holeV: 17, bendX: 76 }), processes: ['sheet-metal'],
      hole_to_edge_thicknesses: 0.25, min_flange_thicknesses: 2,
    });
    expect(status(loose, 'sheet.hole-to-edge')).toBe('pass');
    expect(status(loose, 'sheet.min-flange')).toBe('pass');
  }, 120000);

  it('returns one warn row for a part that is not sheet metal', async () => {
    const r = await dfmReviewTool({ code: 'return box(20, 20, 2);', processes: ['sheet-metal'] });
    expect(r.checks).toEqual([expect.objectContaining({ id: 'sheet.not-sheet-metal', process: 'sheet-metal', status: 'warn' })]);
    expect(r.verdict).toBe('pass');
    expect(r.sheetMetal).toBeUndefined();
  }, 60000);

  it('measures flange legs between parallel bends (pure flat-pattern analysis)', () => {
    const rep = analyzeSheetMetalFlat({
      plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
      outer: [[0, 0], [100, 0], [100, 40], [0, 40]],
      holes: [],
      bendLines: [
        { start: [10, 0], end: [10, 40], angle: 90, radius: 1, ordinal: 0 },
        { start: [90, 0], end: [90, 40], angle: 90, radius: 1, ordinal: 1 },
      ],
    }, { thickness: 1, kFactor: 0.5, settings: SHEET_METAL_DEFAULTS, terminalId: 't' });
    const halfZone = (Math.PI / 2) * (0.5 + 1) / 2;
    const outer = rep.flanges.find(f => f.bend === 0 && f.side === '-')!;
    // Leg from the zone edge to x = 0, plus R + t (outside of the bend).
    expect(outer.lengthMm).toBeCloseTo(10 - halfZone + 1 + 1, 6);
    const web = rep.flanges.find(f => f.bend === 0 && f.side === '+')!;
    expect(web.lengthMm).toBeCloseTo(80 - 2 * halfZone + 2, 6);
  });
});

describe('dfm_review injection-molding', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('fails an undrafted box on mold.draft and names its side faces', async () => {
    const r = await dfmReviewTool({ code: 'return box(40, 30, 3);', processes: ['injection-molding'] });
    expect(r.checks.map(c => c.id)).toEqual(['mold.draft', 'mold.wall-thickness', 'mold.undercuts', 'mold.sharp-internal-corners']);
    expect(status(r, 'mold.draft')).toBe('fail');
    const faces = r.injectionMolding![0].result.draft.insufficient.map(d => d.faceRef).sort();
    expect(faces).toHaveLength(4);
    for (const f of faces) expect(f).toMatch(/^@kc\[.*\/face\/(front|back|left|right)\]$/);
    expect(status(r, 'mold.wall-thickness')).toBe('pass');
    expect(status(r, 'mold.undercuts')).toBe('pass');
    expect(r.verdict).toBe('fail');
  }, 60000);

  it('passes the same box drafted 2° on every side', async () => {
    const r = await dfmReviewTool({ code: DRAFTED, processes: ['injection-molding'] });
    expect(r.checks.filter(c => c.status !== 'pass')).toEqual([]);
    expect(r.verdict).toBe('pass');
    // A stricter minimum draft than the 2° applied fails it again.
    const strict = await dfmReviewTool({ code: DRAFTED, processes: ['injection-molding'], min_draft_deg: 3 });
    expect(status(strict, 'mold.draft')).toBe('fail');
  }, 60000);

  it('flags a side slot as an undercut along +z (two-part mold), with a location', async () => {
    const r = await dfmReviewTool({ code: SIDE_SLOT, processes: ['injection-molding'] });
    expect(status(r, 'mold.undercuts')).toBe('fail');
    const u = r.injectionMolding![0].result.undercut;
    expect(u.areaMm2).toBeGreaterThan(100);
    expect(u.faces[0].location[2]).toBeGreaterThan(5.9);
    expect(u.faces[0].location[2]).toBeLessThan(9.1);
    expect(u.faces[0].faceRef).toMatch(/^@kc\[/);
    expect(status(r, 'mold.sharp-internal-corners')).toBe('warn');
    // The engine's own diagnostics come with it, at the same severity as the row.
    expect(r.diagnostics.some(d => d.code === 'dfm.moulding.undercut' && d.severity === 'error')).toBe(true);
  }, 60000);

  it('checks wall thickness against min_wall_mm / max_wall_mm and warns on non-uniform walls', async () => {
    const thin = await dfmReviewTool({ code: DRAFTED.replace('box(40, 30, 3)', 'box(40, 30, 0.5)'), processes: ['injection-molding'] });
    expect(status(thin, 'mold.wall-thickness')).toBe('fail');
    expect(check(thin, 'mold.wall-thickness')?.limit).toBe(1); // MOULDING_DEFAULTS.minWallMm
    const thinner = await dfmReviewTool({ code: DRAFTED.replace('box(40, 30, 3)', 'box(40, 30, 0.5)'), processes: ['injection-molding'], min_wall_mm: 0.4 });
    expect(status(thinner, 'mold.wall-thickness')).not.toBe('fail');
    // A solid 10 mm block: thick section (warn, like the dfmSpec gate's dfm.moulding.thick-wall).
    const thick = await dfmReviewTool({ code: 'return box(20, 20, 10);', processes: ['injection-molding'] });
    expect(status(thick, 'mold.wall-thickness')).toBe('warn');
    expect(check(thick, 'mold.wall-thickness')?.value).toBeGreaterThan(9);
    expect(check(thick, 'mold.wall-thickness')?.limit).toBe(4);
    // 3.5 mm plate with a 1.2 mm rib: within 1–4 mm but ~2.9× non-uniform.
    const RIB = 'return box(40, 30, 3.5).union(box(1.2, 30, 8).translate(20, 0, 3.5));';
    const rib = await dfmReviewTool({ code: RIB, processes: ['injection-molding'] });
    expect(status(rib, 'mold.wall-thickness')).toBe('warn');
    expect(check(rib, 'mold.wall-thickness')?.limit).toBe(2.5);
    const relaxed = await dfmReviewTool({ code: RIB, processes: ['injection-molding'], max_wall_ratio: 4 });
    expect(status(relaxed, 'mold.wall-thickness')).toBe('pass');
  }, 120000);

  it('uses the script dfmSpec moulding settings as defaults, call options on top', async () => {
    const code = `dfmSpec({ process: 'moulding', minDraftDeg: 3 });\n${DRAFTED}`;
    const spec = await dfmReviewTool({ code, processes: ['injection-molding'] });
    expect(status(spec, 'mold.draft')).toBe('fail');
    expect(check(spec, 'mold.draft')?.limit).toBe(3);
    const call = await dfmReviewTool({ code, processes: ['injection-molding'], min_draft_deg: 1 });
    expect(status(call, 'mold.draft')).toBe('pass');
  }, 60000);

  it('honours pull_direction', async () => {
    // Drafted for +z; pulled along +x its top and bottom faces have zero draft.
    const r = await dfmReviewTool({ code: DRAFTED, processes: ['injection-molding'], pull_direction: '+x' });
    expect(status(r, 'mold.draft')).toBe('fail');
  }, 60000);

  it('rejects bad molding options before evaluating', async () => {
    for (const bad of [{ pull_direction: 'up' }, { min_draft_deg: 95 }, { min_wall_mm: 2, max_wall_mm: 1 }, { max_wall_ratio: 0 }]) {
      const r = await dfmReviewTool({ code: 'return box(1, 1, 1);', processes: ['injection-molding'], ...(bad as object) });
      expect(r.ok).toBe(false);
      expect(r.diagnostics[0].code).toBe('cli.invalid-args');
    }
  });

  it('keeps the default processes at fdm + cnc', async () => {
    const r = await dfmReviewTool({ code: 'return box(40, 30, 10);' });
    expect(r.processes).toEqual(['fdm', 'cnc']);
    expect(r.sheetMetal).toBeUndefined();
    expect(r.injectionMolding).toBeUndefined();
  }, 60000);
});

describe('dfm_review CNC corner false positives', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('does not report the facets of a blind side hole floor as sharp corners', async () => {
    const code = "return box(70, 50, 20).hole('right', { u: 0, v: 0, diameter: 8, depth: 15 });";
    for (const axes of [['+z'], ['+z', '+x']]) {
      const r = await dfmReviewTool({ code, processes: ['cnc'], approach_axes: axes });
      expect(r.cnc![0].result.sharpInternalCorners).toEqual([]);
      expect(status(r, 'cnc.internal-corner-radius')).toBe('pass');
    }
  }, 60000);

  it('does not check the floor edges of a closed top pocket as vertical corners for a +x setup', async () => {
    const code = 'return box(70, 50, 20).subtract(box(30, 20, 8).translate(20, 15, 12));';
    const r = await dfmReviewTool({ code, processes: ['cnc'], approach_axes: ['+z', '+x'] });
    const corners = r.cnc![0].result.sharpInternalCorners;
    expect(corners).toHaveLength(4); // only the four vertical pocket corners
    for (const c of corners) expect(c.axis).toEqual([0, 0, 1]);
  }, 60000);

  it('does not flag the floor edges of an open slot reachable from +x, which +z cuts as floor corners', async () => {
    const code = 'return box(70, 50, 20).subtract(box(70, 20, 8).translate(0, 15, 12));';
    const r = await dfmReviewTool({ code, processes: ['cnc'], approach_axes: ['+z', '+x'] });
    expect(r.cnc![0].result.sharpInternalCorners).toEqual([]);
  }, 60000);
});

describe('dfm_review fdm.min-hole diagnostic severity', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('emits the too-small-hole diagnostic as an error, matching the failed check', async () => {
    const code = 'return box(20, 20, 5).subtract(cylinder(5, 0.75).translate(10, 10, 0));';
    const r = await dfmReviewTool({ code, processes: ['fdm'] });
    expect(status(r, 'fdm.min-hole')).toBe('fail');
    const holes = r.diagnostics.filter(d => d.code === 'dfm.fdm.feature-too-small' && / hole /.test(d.message));
    expect(holes.length).toBeGreaterThan(0);
    for (const d of holes) expect(d.severity).toBe('error');
  }, 60000);
});
