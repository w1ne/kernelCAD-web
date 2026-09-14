// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Slow proofs for modeled threads. A modeled thread costs seconds per feature
// (the bore-vs-groove boolean and helical-face intersections), so these run
// only when KERNELCAD_SLOW_GEOMETRY_TESTS=1 — set by the non-required
// `geometry-proofs` CI job — and stay out of the required sharded `test` gate.
// The required suite keeps short M3 checks in
// tests/unit/backends/occt/helicalSweep.test.ts and holeThread.test.ts.
//
// Imports stay inside the gated describe so the required shards pay ~0 time
// when the env flag is unset.
//
// Run locally:
//   KERNELCAD_SLOW_GEOMETRY_TESTS=1 npx vitest run tests/integration/modeling/modeledThreadProofs.test.ts

import { describe, it, expect, beforeAll } from 'vitest';

const SLOW_GEOMETRY_TESTS = process.env.KERNELCAD_SLOW_GEOMETRY_TESTS === '1';

const ISO_COARSE: Array<[string, number, number]> = [
  ['M3', 3, 0.5], ['M4', 4, 0.7], ['M5', 5, 0.8], ['M6', 6, 1.0], ['M8', 8, 1.25], ['M10', 10, 1.5], ['M12', 12, 1.75],
];

describe.runIf(SLOW_GEOMETRY_TESTS)('modeled thread proofs (KERNELCAD_SLOW_GEOMETRY_TESTS=1)', () => {
  type OcctBackend = import('../../../src/kernel/backends/occt/occtBackend').OcctBackend;
  type Helpers = typeof import('../../threadGeometryHelpers');
  type Iso = typeof import('../../../src/kernel/backends/occt/isoThread');

  let helpers: Helpers;
  let iso: Iso;
  let analyticHelicalSweepVolume: typeof import('../../../src/kernel/backends/occt/helicalSweep').analyticHelicalSweepVolume;
  let callMcpTool: typeof import('../../../src/agent/mcp/toolRegistry').callMcpTool;
  let evaluateScript: typeof import('../../../src/agent/cli/commands/evaluate').evaluateScript;
  let listPartStatsTool: typeof import('../../../src/agent/mcp/tools/listPartStats').listPartStatsTool;
  let checkInterference: typeof import('../../../src/agent/script-runtime/checkInterference').checkInterference;
  let readFileSync: typeof import('node:fs').readFileSync;
  let lower: (code: string) => Promise<{ result: { diagnostics: Array<{ severity: string; code?: string }> }; shape: OcctBackend | undefined }>;
  let volumeOf: (code: string) => Promise<number>;

  beforeAll(async () => {
    const [
      occtMod,
      runMod,
      engineMod,
      lowererMod,
      mcpMod,
      evalMod,
      statsMod,
      clashMod,
      sweepMod,
      isoMod,
      helpMod,
      fsMod,
    ] = await Promise.all([
      import('../../../src/kernel/backends/occt/occtBackend'),
      import('../../../src/modeling/runtime/runScript'),
      import('../../../src/modeling/compute/recomputeEngine'),
      import('../../../src/modeling/backends/occt/occtLowerer'),
      import('../../../src/agent/mcp/toolRegistry'),
      import('../../../src/agent/cli/commands/evaluate'),
      import('../../../src/agent/mcp/tools/listPartStats'),
      import('../../../src/agent/script-runtime/checkInterference'),
      import('../../../src/kernel/backends/occt/helicalSweep'),
      import('../../../src/kernel/backends/occt/isoThread'),
      import('../../threadGeometryHelpers'),
      import('node:fs'),
    ]);
    helpers = helpMod;
    iso = isoMod;
    analyticHelicalSweepVolume = sweepMod.analyticHelicalSweepVolume;
    callMcpTool = mcpMod.callMcpTool;
    evaluateScript = evalMod.evaluateScript;
    listPartStatsTool = statsMod.listPartStatsTool;
    checkInterference = clashMod.checkInterference;
    readFileSync = fsMod.readFileSync;
    lower = async (code: string) => {
      const run = await runMod.runScript({ code, fileName: 'proof.kcad.ts' });
      const r = await new engineMod.RecomputeEngine(lowererMod.createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
      return { result: r, shape: r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined };
    };
    volumeOf = async (code: string) => {
      const out = (await callMcpTool('inspect', { of: 'shape', code })) as { ok: boolean; error?: string; shape: { volume: number } };
      expect(out.ok, out.error).toBe(true);
      return out.shape.volume;
    };
    await occtMod.initOcct();
  }, 60_000);

  describe("sweep(helix(), { spine: 'helix' }) across the ISO table", () => {
    it.each(ISO_COARSE)('%s ISO V ridge is a valid solid with the analytic volume', async (_name, d, pitch) => {
      const turns = 4;
      const code = helpers.ridgeScript(d, pitch, turns);
      const { result, shape } = await lower(code);
      expect(result.diagnostics.filter((x) => x.severity === 'error')).toHaveLength(0);
      expect(helpers.brepValid(shape!)).toBe(true);
      const analytic = analyticHelicalSweepVolume(iso.isoExternalRidgeProfile(d, pitch), iso.isoMinorRadius(d, pitch), turns);
      expect(Math.abs((await volumeOf(code)) - analytic) / analytic).toBeLessThan(1e-4);
    }, 60_000);

    it('keeps the swept faces usable by later booleans', async () => {
      // A bored block intersected with the ridge. A single helix edge makes
      // faces that wrap every turn and this common came back EMPTY; the
      // per-half-turn spine gives the value measured in two simple steps.
      const ridge = helpers.ridgeScript(6, 1, 5).replace('return profile.sweep', 'const ridge = profile.sweep');
      const rBore = iso.isoMinorRadius(6, 1) + 0.05;
      const block = 'box(9.6, 9.6, 2.4).translate(-4.8, -4.8, 1.2)';
      const bore = `cylinder(20, ${rBore}).translate(0, 0, -5)`;
      const expected = (await volumeOf(`${ridge} return ridge.intersect(${block});`))
        - (await volumeOf(`${ridge} return ridge.intersect(${block}).intersect(${bore});`));
      expect(expected).toBeGreaterThan(5);
      expect(await volumeOf(`${ridge} return ridge.intersect(${block}.subtract(${bore}));`)).toBeCloseTo(expected, 3);
    }, 120_000);
  });

  describe('hole({ thread }) modeled', () => {
    it('M8 through thread: valid solid, analytic removed volume', async () => {
      const [D, P, c, side] = [8, 1.25, 0.1, 24];
      const h = 1.5 * P;
      const code = `return box(${side}, ${side}, ${h}, true).hole('top', { u: 0, v: 0, diameter: ${D}, depth: 'through', thread: { pitch: ${P}, modeled: true, clearance: ${c} } });`;
      const { shape } = await lower(code);
      expect(helpers.brepValid(shape!)).toBe(true);
      const removed = side * side * h - (await volumeOf(code));
      expect(Math.abs(removed - helpers.tappedRemoval(D, P, c, h)) / helpers.tappedRemoval(D, P, c, h)).toBeLessThan(1e-4);
    }, 60_000);

    it('stops a blind thread short of the floor', async () => {
      const [D, P] = [4, 0.7];
      const code = `return box(20, 20, 10, true).hole('top', { u: 0, v: 0, diameter: ${D}, depth: 2.5, thread: { pitch: ${P}, modeled: true } });`;
      const { result, shape } = await lower(code);
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
      expect(helpers.brepValid(shape!)).toBe(true);
      const removed = 20 * 20 * 10 - shape!.volume();
      // More than the plain bore, less than a groove running the full depth.
      expect(removed).toBeGreaterThan(Math.PI * iso.isoMinorRadius(D, P) ** 2 * 2.5 + 3);
      expect(removed).toBeLessThan(helpers.tappedRemoval(D, P, 0, 2.5));
    }, 60_000);

    it('threads every position of holes()', async () => {
      const code = `return box(40, 20, 1, true).holes('top', { positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }], diameter: 4, depth: 'through', thread: { pitch: 0.7, modeled: true } });`;
      const { result, shape } = await lower(code);
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
      expect(40 * 20 * 1 - shape!.volume()).toBeCloseTo(2 * helpers.tappedRemoval(4, 0.7, 0, 1), 2);
    }, 60_000);
  });

  describe('threaded bolt in threaded nut', () => {
    // M3 bolt (swept V ridge) in an 8×8×1 nut cut by hole({ thread }), the
    // nut's top face on a whole pitch so the threads are in phase.
    const D = 3;
    const P = 0.5;
    const CLEARANCE = 0.05;
    const NUT_H = 1;
    const fastenerScript = (modeled: boolean) => {
      const pts = iso.isoExternalRidgeProfile(D, P);
      const chain = pts.slice(1).map(([x, y]) => `.lineTo(${x}, ${y})`).join('');
      return `
        const rMinor = ${iso.isoMinorRadius(D, P)};
        const ridge = path().moveTo(${pts[0][0]}, ${pts[0][1]})${chain}.close()
          .sweep(helix({ radius: rMinor, pitch: ${P}, turns: 6 }), { spine: 'helix' });
        const bolt = cylinder(${7 * P}, rMinor).union(ridge);
        const nut = box(8, 8, ${NUT_H}).translate(-4, -4, 0).hole({ atZ: ${NUT_H}, byNormal: 'Z' }, {
          u: 0, v: 0, diameter: ${D}, depth: 'through',
          thread: { pitch: ${P}, modeled: ${modeled}, clearance: ${CLEARANCE} },
        });
        dfmSpec({ minClearance: ${CLEARANCE * 0.8} });
        const arm = assembly('fit');
        arm.part('bolt', bolt);
        arm.part('nut', nut, { at: [0, 0, ${4 * P - NUT_H}] });
        return arm.model();
      `;
    };
    interface DfmOut { clearance: Array<{ a: string; b: string; distanceMm: number; status: string; exact: boolean }> }

    it('keeps exactly the thread clearance between the parts (zero interference)', async () => {
      const out = (await callMcpTool('verify', { check: 'dfm', code: fastenerScript(true) })) as DfmOut;
      const pair = out.clearance.find((p) => p.a !== p.b)!;
      expect(pair.exact).toBe(true);
      expect(pair.status).toBe('ok');
      expect(pair.distanceMm).toBeCloseTo(CLEARANCE, 3);
    }, 180_000);

    it('reports the cosmetic-thread control as overlapping', async () => {
      const out = (await callMcpTool('verify', { check: 'dfm', code: fastenerScript(false) })) as DfmOut;
      const pair = out.clearance.find((p) => p.a !== p.b)!;
      expect(pair.status).toBe('interfering');
    }, 180_000);
  });

  it('M6 bolt-and-nut example: analytic nut volume and no interference', async () => {
    const file = 'examples/cookbook-parity/iso-metric-bolt-and-nut.kcad.ts';
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const stats = await listPartStatsTool({ file });
    expect(stats.ok, stats.error).toBe(true);
    const bolt = stats.parts!.find((p) => p.name === 'hex-bolt')!;
    const nut = stats.parts!.find((p) => p.name === 'hex-nut')!;
    const [d, pitch, af, headHeight, nutHeight, turns, clearance] = [6, 1, 10, 4, 5.2, 12, 0.05];

    const size = [0, 1].map((i) => bolt.bbox.max[i] - bolt.bbox.min[i]);
    expect(Math.min(size[0], size[1])).toBeCloseTo(af, 0);
    expect(bolt.bbox.max[2]).toBeCloseTo(headHeight + (turns + 1) * pitch, 2);

    // Nut = hex prism − ISO minor bore (+clearance) − helical groove, exactly.
    const rBore = iso.isoMinorRadius(d, pitch) + clearance;
    const removed = Math.PI * rBore * rBore * nutHeight
      + (nutHeight / pitch) * 2 * Math.PI * helpers.profileMoment(iso.isoInternalGrooveProfile(d, pitch, clearance), rBore, 0);
    expect(nut.volumeMm3 / ((Math.sqrt(3) / 2) * af * af * nutHeight - removed)).toBeCloseTo(1, 4);

    const clash = await checkInterference({ code: readFileSync(file, 'utf8'), fileName: file });
    expect(clash.comparisonCount).toBe(1);
    expect(clash.diagnostics.filter((x) => x.code === 'feature.kernel-failed')).toHaveLength(0);
    expect(clash.pairs).toEqual([]);
  }, 400_000);
});
