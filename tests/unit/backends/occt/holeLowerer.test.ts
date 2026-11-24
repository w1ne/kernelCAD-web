// tests/unit/backends/occt/holeLowerer.test.ts
//
// Integration tests driving Shape.hole() / Shape.holes() through runScript →
// recompute → OCCT lowering. Asserts (a) the recompute succeeds, (b) volume
// drops by an expected amount, and (c) the slice-1 created refs (`wall`,
// `floor`, `wall-back`, `counterbore-*`, `countersink-cone`) are addressable
// via the existing FaceSelector resolver.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

async function lowerScript(code: string): Promise<{
  shape: OcctBackend;
  diagnostics: ReturnType<RecomputeEngine['_diagnosticsForTest']> | unknown[];
  recordCount: number;
}> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const lastRecord = records[records.length - 1];
  const shape = r.shapes.get(lastRecord.id) as OcctBackend;
  return { shape, diagnostics: r.diagnostics, recordCount: records.length };
}

describe('holeLowerer — single hole', () => {
  beforeAll(async () => { await initOcct(); });

  it.each([
    ['plain', '', 4],
    ['threaded', ', thread: { pitch: 0.7, modeled: false }', 4 - 1.0825 * 0.7],
  ])('keeps the %s blind-hole floor at the requested depth', async (_name, thread, boreDiameter) => {
    const { shape, diagnostics } = await lowerScript(`return box(20,20,10).hole('top', { u: 0, v: 0, diameter: 4, depth: 5 ${thread} });`);
    expect(diagnostics).toEqual([]);
    const expected = 20 * 20 * 10 - Math.PI * (boreDiameter / 2) ** 2 * 5;
    // Thread minor-diameter constants are rounded; this tolerance still
    // detects the former 0.01 mm floor error for either diameter.
    expect(shape.volume()).toBeCloseTo(expected, 2);
  });

  it('blind hole removes ~ π·r²·depth volume from a box', async () => {
    const code = `
      const base = box(40, 40, 20);
      return base.hole('top', { u: 0, v: 0, diameter: 10, depth: 8 });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    const vol = shape.volume();
    const expected = 40 * 40 * 20 - Math.PI * 5 * 5 * 8;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it('through-hole removes ~ π·r²·boxThickness volume', async () => {
    const code = `
      const base = box(40, 40, 10);
      return base.hole('top', { u: 5, v: 0, diameter: 6, depth: 'through' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    const vol = shape.volume();
    const expected = 40 * 40 * 10 - Math.PI * 3 * 3 * 10;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it('counterbored through-hole removes bore + cb annular pocket', async () => {
    const code = `
      const base = box(50, 50, 12);
      return base.hole('top', {
        u: 0, v: 0, diameter: 6, depth: 'through',
        counterbore: { diameter: 11, depth: 4 },
      });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    expect(diagnostics).toEqual([]);
    const vol = shape.volume();
    const boreVol = Math.PI * 3 * 3 * 12;
    const cbAnnular = Math.PI * (5.5 * 5.5 - 3 * 3) * 4;
    const expected = 50 * 50 * 12 - boreVol - cbAnnular;
    expect(vol).toBeGreaterThan(expected - 1);
    expect(vol).toBeLessThan(expected + 1);
  });

  it("creates a 'wall' ref that resolves on the hole result via faceLabel lookup", async () => {
    const code = `
      const base = box(40, 40, 20);
      const drilled = base.hole('top', { u: 0, v: 0, diameter: 10, depth: 8 });
      // .fillet on the bore wall — passes if pickEdges finds the wall by labelName.
      return drilled.fillet(0.5, { face: 'wall' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    // No errors means: the fillet found the bore wall via the 'wall' created ref,
    // selected ≥1 sharp edge, and OCCT successfully rounded.
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    expect(shape).toBeDefined();
  });
});

describe('holeLowerer — drill-point blind holes', () => {
  beforeAll(async () => { await initOcct(); });

  /** Cone-tip depth of a drill point with included angle `angleDeg`. */
  function tipDepth(radius: number, angleDeg = 118): number {
    return radius / Math.tan((angleDeg / 2) * Math.PI / 180);
  }

  it('adds the 118° drill-point cone below a blind bore and stays a valid solid', async () => {
    const { shape, diagnostics } = await lowerScript(`
      return box(40, 40, 20).hole('top', {
        u: 0, v: 0, diameter: 8, depth: 10, drillPoint: true,
      });
    `);
    expect(diagnostics).toEqual([]);

    const r = 4;
    const depth = 10;
    const tip = tipDepth(r);
    const removed = Math.PI * r * r * depth + (Math.PI * r * r * tip) / 3;
    expect(shape.volume()).toBeCloseTo(40 * 40 * 20 - removed, 2);

    const boxArea = 2 * (40 * 40) + 4 * (40 * 20);
    const coneSlant = Math.hypot(r, tip);
    const expectedArea = boxArea - Math.PI * r * r + 2 * Math.PI * r * depth + Math.PI * r * coneSlant;
    expect(shape.surfaceArea()).toBeCloseTo(expectedArea, 1);

    expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
    const bb = shape.boundingBox();
    expect(bb.min).toEqual([0, 0, 0]);
    expect(bb.max).toEqual([40, 40, 20]);
  });

  it('honours a custom drill-point angle', async () => {
    const { shape, diagnostics } = await lowerScript(`
      return box(40, 40, 20).hole('top', {
        u: 0, v: 0, diameter: 8, depth: 10, drillPoint: { angleDeg: 90 },
      });
    `);
    expect(diagnostics).toEqual([]);

    const r = 4;
    const tip = tipDepth(r, 90);
    const removed = Math.PI * r * r * 10 + (Math.PI * r * r * tip) / 3;
    expect(shape.volume()).toBeCloseTo(40 * 40 * 20 - removed, 2);
    expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
  });

  it('applies the drill point to every bore in holes()', async () => {
    const { shape, diagnostics } = await lowerScript(`
      return box(60, 40, 8).holes('top', {
        positions: [{ u: -15, v: 0 }, { u: 15, v: 0 }],
        diameter: 6, depth: 5, drillPoint: true,
      });
    `);
    expect(diagnostics).toEqual([]);

    const r = 3;
    const tip = tipDepth(r);
    const one = Math.PI * r * r * 5 + (Math.PI * r * r * tip) / 3;
    expect(shape.volume()).toBeCloseTo(60 * 40 * 8 - 2 * one, 2);
    expect(isValidShape(getOC(), wrapped(shape))).toBe(true);
  });

  it.each([
    ["depth: 'through'", "depth: 'through', drillPoint: true"],
    ['upToFace', "upToFace: 'bottom', drillPoint: true"],
  ])('refuses a drill point with %s', async (_name, opts) => {
    const { diagnostics } = await lowerScript(`
      return box(40, 40, 20).hole('top', { u: 0, v: 0, diameter: 8, ${opts} });
    `);
    const errs = (diagnostics as { severity: string; code: string; message: string }[])
      .filter(d => d.severity === 'error');
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].code).toBe('feature.invalid-args');
    expect(errs[0].message).toMatch(/drillPoint/);
  });

  it('refuses a drill-point angle outside (0, 180)', async () => {
    const { diagnostics } = await lowerScript(`
      return box(40, 40, 20).hole('top', {
        u: 0, v: 0, diameter: 8, depth: 10, drillPoint: { angleDeg: 200 },
      });
    `);
    const errs = (diagnostics as { severity: string; code: string; message: string }[])
      .filter(d => d.severity === 'error');
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].code).toBe('feature.invalid-args');
    expect(errs[0].message).toMatch(/angleDeg/);
  });
});

describe('holeLowerer — batched holes', () => {
  beforeAll(async () => { await initOcct(); });

  it('4-position bolt pattern subtracts ~ 4 · π·r²·boxThickness', async () => {
    const code = `
      const base = box(60, 60, 8);
      return base.holes('top', {
        positions: [{u: -20, v: -20}, {u: 20, v: -20}, {u: -20, v: 20}, {u: 20, v: 20}],
        diameter: 5, depth: 'through',
      });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    const vol = shape.volume();
    const expected = 60 * 60 * 8 - 4 * Math.PI * 2.5 * 2.5 * 8;
    expect(vol).toBeGreaterThan(expected - 2);
    expect(vol).toBeLessThan(expected + 2);
  });

  it("filleting 'wall' on a 4-hole batch finds all bore walls (collective sugar)", async () => {
    const code = `
      const base = box(60, 60, 8);
      const drilled = base.holes('top', {
        positions: [{u: -15, v: -15}, {u: 15, v: -15}, {u: -15, v: 15}, {u: 15, v: 15}],
        diameter: 4, depth: 'through',
      });
      return drilled.fillet(0.3, { face: 'wall' });
    `;
    const { shape, diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    expect(shape).toBeDefined();
  });
});

describe('holeLowerer — error paths', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits feature.kernel-failed when through is requested but the body is too thin to find a back face anti-parallel to entry', async () => {
    // A "valid" through case is normally fine. We construct a degenerate case:
    // a sphere has no anti-parallel cardinal back face. The hole should
    // fail via the through-no-back-face hint or via feature.face-ref.not-applicable
    // (sphere doesn't accept canonical 'top').
    const code = `
      const base = sphere(10);
      // sphere does not have a canonical 'top' face — pickFace will reject.
      // Wrap in try/catch via the diagnostic stream.
      return base.hole('top', { u: 0, v: 0, diameter: 4, depth: 'through' });
    `;
    const { diagnostics } = await lowerScript(code);
    const errs = (diagnostics as { severity: string; code: string }[]).filter(d => d.severity === 'error');
    expect(errs.length).toBeGreaterThan(0);
    // Code must be from the catalog (sentinel verifies this generally).
    expect([
      'feature.face-ref.not-resolvable',
      'feature.face-ref.not-applicable',
      'feature.face-ref.removed',
      'feature.kernel-failed',
      'feature.hole.no-target-face',
      'feature.invalid-args',
    ]).toContain(errs[0].code);
  });

  it("drills 'through' from an off-centre face of an L-extrusion (was a false no-target-face)", async () => {
    // L-shape extrusion (CCW): the bottom arm spans x∈[0,40], y∈[0,10]; the
    // vertical leg spans x∈[0,10], y∈[0,40]. Drilling from a +X-normal face
    // sets the bore axis at -X. The old heuristic compared the only -X face
    // (x=0, centre y=20) to the ENTRY-FACE centroid and rejected it; the
    // through depth is now cast along the axis from the hole itself, which
    // runs through material to x = 0 either way.
    const code = `
      const base = extrudePolygon([[0,0],[40,0],[40,10],[10,10],[10,40],[0,40]], 5);
      return base.hole({ byNormal: 'X' }, { u: 0, v: 0, diameter: 4, depth: 'through' });
    `;
    const { diagnostics, shape } = await lowerScript(code);
    const errs = (diagnostics as { severity: string; code: string }[]).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
    const full = 40 * 10 * 5 + 10 * 30 * 5;
    const removed = full - (shape as { volume(): number }).volume();
    const bore = (len: number) => Math.PI * 4 * len;
    // Entry at x=40 (bore 40 long) or at x=10 (bore 10 long), whichever face matched.
    expect([bore(40), bore(10)].some((v) => Math.abs(v - removed) < 0.5)).toBe(true);
  });
});
