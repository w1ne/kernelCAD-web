// tests/unit/dfm/dfmReview.test.ts
//
// dfm_review MCP tool: FDM + CNC pass/fail checklist without a dfmSpec.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { dfmReviewTool, type DfmReviewOutput } from '../../../src/agent/mcp/tools/dfmReview';
import { axisVector, findSharpInternalCorners } from '../../../src/modeling/runtime/dfm/cncCheck';

const status = (r: DfmReviewOutput, id: string): string | undefined => r.checks.find(c => c.id === id)?.status;

const TEE = `
  const stem = box(4, 10, 20).translate(10, 0, 0);
  const bar = box(24, 10, 4).translate(0, 0, 20);
  return stem.union(bar);
`;
const POCKET = 'return box(40, 40, 10).subtract(box(20, 20, 5).translate(10, 10, 5));';
const ROUND_POCKET = 'return box(40, 40, 10).subtract(box(20, 20, 8).fillet(1).translate(10, 10, 5));';

describe('dfm_review', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('passes a plain block on every FDM and CNC check', async () => {
    const r = await dfmReviewTool({ code: 'return box(40, 30, 10);' });
    expect(r.ok).toBe(true);
    expect(r.processes).toEqual(['fdm', 'cnc']);
    expect(r.checks.map(c => c.id)).toEqual([
      'fdm.overhangs', 'fdm.bridging', 'fdm.min-wall', 'fdm.min-hole', 'fdm.min-pin', 'fdm.bed-fit', 'fdm.bed-contact',
      'cnc.undercuts', 'cnc.internal-corner-radius',
    ]);
    expect(r.checks.filter(c => c.status !== 'pass')).toEqual([]);
    expect(r.verdict).toBe('pass');
  }, 60000);

  it('fails a T cantilever on FDM overhangs and on CNC undercuts from +z, and passes with a flipped second setup', async () => {
    const r = await dfmReviewTool({ code: TEE });
    expect(status(r, 'fdm.overhangs')).toBe('fail');
    expect(status(r, 'cnc.undercuts')).toBe('fail');
    expect(r.cnc![0].result.undercut.areaMm2).toBeCloseTo(600, 0); // arm undersides 2 × 100 + the stem walls they shadow 2 × 200
    expect(r.verdict).toBe('fail');
    const two = await dfmReviewTool({ code: TEE, processes: ['cnc'], approach_axes: ['+z', '-z'] });
    expect(two.checks.map(c => c.id)).toEqual(['cnc.undercuts', 'cnc.internal-corner-radius']);
    expect(status(two, 'cnc.undercuts')).toBe('pass');
  }, 60000);

  it('flags the sharp internal corners of a square pocket against the tool radius', async () => {
    const r = await dfmReviewTool({ code: POCKET, processes: ['cnc'] });
    expect(status(r, 'cnc.undercuts')).toBe('pass');
    expect(status(r, 'cnc.internal-corner-radius')).toBe('fail');
    expect(r.cnc![0].result.sharpInternalCorners).toHaveLength(4);
    for (const c of r.cnc![0].result.sharpInternalCorners) expect(c.lengthMm).toBeCloseTo(5, 3);
  }, 60000);

  it('compares rounded pocket corners with the end-mill radius', async () => {
    const big = await dfmReviewTool({ code: ROUND_POCKET, processes: ['cnc'], tool_diameter_mm: 6 });
    expect(big.cnc![0].result.sharpInternalCorners).toEqual([]);
    expect(big.cnc![0].result.tightFillets.length).toBeGreaterThanOrEqual(4);
    expect(big.cnc![0].result.tightFillets[0].radiusMm).toBeCloseTo(1, 6);
    expect(status(big, 'cnc.internal-corner-radius')).toBe('fail');
    const small = await dfmReviewTool({ code: ROUND_POCKET, processes: ['cnc'], tool_diameter_mm: 1.5 });
    expect(status(small, 'cnc.internal-corner-radius')).toBe('pass');
  }, 60000);

  it('flags a hole below the FDM minimum and passes it with a finer nozzle', async () => {
    const code = 'return box(20, 20, 5).subtract(cylinder(5, 0.75).translate(10, 10, 0));';
    const r = await dfmReviewTool({ code, processes: ['fdm'] });
    expect(status(r, 'fdm.min-hole')).toBe('fail');
    expect(r.checks.find(c => c.id === 'fdm.min-hole')?.value).toBeCloseTo(1.5, 6);
    const fine = await dfmReviewTool({ code, processes: ['fdm'], nozzle_mm: 0.25 });
    expect(status(fine, 'fdm.min-hole')).toBe('pass');
  }, 60000);

  it('fails bed fit on a part larger than the printer bed', async () => {
    const r = await dfmReviewTool({ code: 'return box(400, 400, 10);', processes: ['fdm'] });
    expect(status(r, 'fdm.bed-fit')).toBe('fail');
  }, 60000);

  it('rejects bad options before evaluating', async () => {
    for (const bad of [
      { processes: ['sla'] }, { nozzle_mm: -1 }, { approach_axes: ['up'] }, { printer: 'nope' }, { max_overhang_deg: 120 },
    ]) {
      const r = await dfmReviewTool({ code: 'return box(1, 1, 1);', ...(bad as object) });
      expect(r.ok).toBe(false);
      expect(r.diagnostics[0].code).toBe('cli.invalid-args');
    }
  });

  it('returns the evaluate diagnostics when the script fails', async () => {
    const r = await dfmReviewTool({ code: 'return notAFunction();' });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  }, 60000);
});

describe('cncCheck helpers', () => {
  it('parses axis tokens', () => {
    expect(axisVector('+z')).toEqual([0, 0, 1]);
    expect(axisVector('-x')).toEqual([-1, 0, 0]);
    expect(axisVector('z')).toBeUndefined();
  });

  it('ignores convex box edges', () => {
    // Unit cube, outward winding.
    const v = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
    const t = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
    expect(findSharpInternalCorners({ vertices: v, triangles: t }, [[0, 0, 1]])).toEqual([]);
  });
});
