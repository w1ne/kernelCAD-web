// tests/unit/diagnostics/unionIntegrity.test.ts
//
// Geometry-validity guard for union()-built models. `assembly()` models get
// interference + floating-part checks from the assembly validator; a model
// fused with `union()` used to bypass both. The guard runs at the shared
// evaluate seam (`evaluateAndBuildScript`), so `evaluate_script`,
// `kernelcad evaluate` and the review payload all report:
//   - union.disconnected   — the union result is more than one solid;
//   - union.member-overlap — two operands that each carry their own
//                            finish/material share > 1 mm³ of volume.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

const FIXTURES = fileURLToPath(new URL('../../fixtures/union-guard/', import.meta.url));
const BROKEN_TRAY = `${FIXTURES}tray-v1-broken.kcad.ts`;
const FIXED_TRAY = `${FIXTURES}tray-v2-fixed.kcad.ts`;

type Diag = { code: string; severity: string; message: string };
const byCode = (diags: Diag[], code: string) => diags.filter(d => d.code === code);
const unionDiags = (diags: Diag[]) => diags.filter(d => d.code.startsWith('union.'));

describe('union integrity guard', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  afterEach(() => { vi.restoreAllMocks(); });

  it('rejects the shipped ChatGPT tray: cross tubes buried in the rails', async () => {
    const r = await evaluateScriptTool({ file: BROKEN_TRAY });
    expect(r.ok).toBe(false);
    const overlaps = byCode(r.diagnostics, 'union.member-overlap');
    expect(overlaps.length).toBeGreaterThan(0);
    for (const d of overlaps) expect(d.severity).toBe('error');
    const msgs = overlaps.map(d => d.message);
    const hasPair = (a: string, b: string) =>
      msgs.some(m => new RegExp(`\\b${a}\\b`).test(m) && new RegExp(`\\b${b}\\b`).test(m));
    // s1..s4 run 25 mm into both side rails (s5 only touches them: it sits
    // inside the back rail, whose ends the side rails butt against).
    for (const s of ['s1', 's2', 's3', 's4']) {
      expect(hasPair(s, 'left'), `${s} vs left`).toBe(true);
      expect(hasPair(s, 'right'), `${s} vs right`).toBe(true);
    }
    // s5 lies entirely inside the back rail.
    expect(hasPair('s5', 'back')).toBe(true);
    // Volume and overlap bounding box are named.
    expect(msgs.join('\n')).toMatch(/mm³/);
    expect(msgs.join('\n')).toMatch(/overlap box/);
  });

  it('the shipped tray sheet does not float: tubeZ = 7 puts tube tops at z = 37, the sheet underside', async () => {
    // The tray was reported as "sheet floats 7 mm above the tubes". Measured
    // geometry: tubes span z 7..37, sheet z 37..40 — face contact, so the
    // union is ONE solid. The guard must not invent a gap.
    const r = await evaluateScriptTool({ file: BROKEN_TRAY });
    expect(byCode(r.diagnostics, 'union.disconnected')).toEqual([]);
  });

  it('accepts the corrected tray (butt-jointed cross tubes, sheet on the tubes)', async () => {
    const r = await evaluateScriptTool({ file: FIXED_TRAY });
    expect(unionDiags(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('flags the corrected tray when its sheet is lifted 7 mm off the tubes', async () => {
    const code = readFileSync(FIXED_TRAY, 'utf8').replace('const sheetLift = 0;', 'const sheetLift = 7;');
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(false);
    const d = byCode(r.diagnostics, 'union.disconnected');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].message).toMatch(/\bsheet\b/);
    expect(d[0].message).toMatch(/gap 7(\.0+)? mm/);
  });

  it('boss merged into a plate (no separate finishes) passes', async () => {
    const r = await evaluateScriptTool({
      code: `return box(40, 40, 5).union(cylinder(10, 5).translate(20, 20, 4));`,
    });
    expect(unionDiags(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('two separately finished blocks touching on a face pass', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10).finish('aluminium-brushed');
        const b = box(10, 10, 10).translate(10, 0, 0).finish('anodized-black');
        return union(a, b);
      `,
    });
    expect(unionDiags(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('separately finished blocks overlapping 0.5 mm³ pass (below the 1 mm³ threshold)', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10).finish('aluminium-brushed');
        const b = box(10, 10, 10).translate(9, 9, 9.5).finish('anodized-black');
        return union(a, b);
      `,
    });
    expect(unionDiags(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('separately finished blocks overlapping 10x10x2 mm fail with volume ~200 mm³', async () => {
    const r = await evaluateScriptTool({
      code: `
        const lower = box(10, 10, 10).finish('aluminium-brushed');
        const upper = box(10, 10, 10).translate(0, 0, 8).finish('anodized-black');
        return union(lower, upper);
      `,
    });
    expect(r.ok).toBe(false);
    const d = byCode(r.diagnostics, 'union.member-overlap');
    expect(d).toHaveLength(1);
    expect(d[0].message).toMatch(/\blower\b/);
    expect(d[0].message).toMatch(/\bupper\b/);
    const vol = Number(/([\d.]+) mm³/.exec(d[0].message)?.[1]);
    expect(vol).toBeCloseTo(200, 0);
  });

  it('overlap through a chained .union() is still caught', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10).finish('aluminium-brushed');
        const b = box(10, 10, 10).translate(10, 0, 0).finish('aluminium-brushed');
        const c = box(10, 10, 10).translate(0, 0, 8).finish('anodized-black');
        return a.union(b).union(c);
      `,
    });
    const d = byCode(r.diagnostics, 'union.member-overlap');
    expect(d).toHaveLength(1);
    expect(d[0].message).toMatch(/\ba\b/);
    expect(d[0].message).toMatch(/\bc\b/);
  });

  it('two blocks 5 mm apart in a union fail with union.disconnected', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10);
        const b = box(10, 10, 10).translate(15, 0, 0);
        return union(a, b);
      `,
    });
    expect(r.ok).toBe(false);
    const d = byCode(r.diagnostics, 'union.disconnected');
    expect(d).toHaveLength(1);
    expect(d[0].message).toMatch(/2 separate solids/);
    expect(d[0].message).toMatch(/gap 5(\.0+)? mm/);
  });

  it('a union of separate cutting tools used by subtract() is not judged as material', async () => {
    const r = await evaluateScriptTool({
      code: `
        const tools = union(
          cylinder(20, 2).translate(10, 10, -5),
          cylinder(20, 2).translate(30, 10, -5),
        );
        return box(40, 20, 5).subtract(tools);
      `,
    });
    expect(unionDiags(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('a disconnected union inside an assembly part is left to the assembly validator', async () => {
    const r = await evaluateScriptTool({
      code: `
        const arm = assembly('pair');
        arm.part('body', union(box(10, 10, 10), box(10, 10, 10).translate(15, 0, 0)));
        return arm.model();
      `,
      skipMechanismCheck: true,
    });
    expect(byCode(r.diagnostics, 'union.disconnected')).toEqual([]);
  });

  it('member overlap inside an assembly part is still reported', async () => {
    const r = await evaluateScriptTool({
      code: `
        const arm = assembly('frame');
        const lower = box(10, 10, 10).finish('aluminium-brushed');
        const upper = box(10, 10, 10).translate(0, 0, 8).finish('aluminium-brushed');
        arm.part('frame', union(lower, upper));
        return arm.model();
      `,
      skipMechanismCheck: true,
    });
    expect(r.ok).toBe(false);
    expect(byCode(r.diagnostics, 'union.member-overlap')).toHaveLength(1);
  });

  it('edge-only contact is a warning, not a gate failure (no measurable gap)', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10);
        const b = box(10, 10, 10).translate(10, 10, 0);
        return union(a, b);
      `,
    });
    const d = byCode(r.diagnostics, 'union.disconnected');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('warn');
    expect(d[0].message).toMatch(/edges or points/);
    expect(r.ok).toBe(true);
  });

  it('fast path: no BREP intersection when no operand pair carries its own finish', async () => {
    const spy = vi.spyOn(OcctBackend.prototype, 'intersectionVolume');
    const r = await evaluateScriptTool({
      code: `return box(40, 40, 5).union(cylinder(10, 5).translate(20, 20, 4)).finish('aluminium-brushed');`,
    });
    expect(r.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('AABB prefilter: face-touching finished members never reach the BREP probe', async () => {
    const spy = vi.spyOn(OcctBackend.prototype, 'intersectionVolume');
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10).finish('aluminium-brushed');
        const b = box(10, 10, 10).translate(10, 0, 0).finish('anodized-black');
        return union(a, b);
      `,
    });
    expect(r.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});
