// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// End-to-end FEA integration test with an ANALYTIC oracle.
//
// Unit tests prove the deck writer and the result parsers are internally
// consistent. They cannot prove the pipeline computes the right answer —
// a transposed tet node ordering, a force applied per-node instead of as a
// total, or MPa read as Pa would all sail through them and produce a
// confident, wrong safety factor.
//
// So this test solves a case textbook mechanics answers exactly: a
// 200 x 20 x 10 mm mild-steel cantilever, fully fixed at one end, 500 N
// pressing down on the free end.
//
//   Euler-Bernoulli tip deflection  d = F L^3 / (3 E I),  I = b h^3 / 12
//   Root bending stress             s = M c / I,  M = F L,  c = h / 2
//
// The FEA answer must land within 15% of both. The tolerance is one-sided in
// spirit: a 3D solve is expected to be slightly SOFTER than the beam formula
// (it includes shear deflection the formula omits) and to show a stress
// concentration at the built-in end, so agreement inside 15% is the real
// signal that geometry, units, boundary conditions, and element ordering all
// line up.
//
// Skipped with a clear message when the external toolchain is absent; the
// slice ships the writer, the parsers, and this test either way.

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { findFeaStudies } from '../../../src/modeling/runtime/fea/findFeaStudies';
import { runFeaStudy } from '../../../src/kernel/fea/runFea';
import { detectFeaToolchain, requireFeaToolchainIfDemanded, type FeaToolchain } from '../../../src/kernel/fea/toolchain';

const L = 200;
const B = 20;
const H = 10;
const F = 500;
const E = 200_000; // MPa — mild-steel, the same number the material table serves
const I = (B * H ** 3) / 12;
const ANALYTIC_TIP_DEFLECTION = (F * L ** 3) / (3 * E * I);
const ANALYTIC_ROOT_STRESS = ((F * L) * (H / 2)) / I;

const SCRIPT = `
const beam = box(${L}, ${B}, ${H});
beam.feaStudy({
  name: 'cantilever',
  material: 'mild-steel',
  fixed: { atX: 0 },
  loads: [{ name: 'tip', faces: { atX: ${L} }, force: [0, 0, ${-F}] }],
  meshSize: 4,
});
return beam;
`;

let toolchain: FeaToolchain;

beforeAll(async () => {
  toolchain = await detectFeaToolchain();
});

describe('FEA cantilever vs Euler-Bernoulli', () => {
  it('solves a cantilever within 15% of the closed-form tip deflection and root stress', async () => {
    if (!toolchain.ok) {
      requireFeaToolchainIfDemanded(toolchain);
      // Not a silent pass: the reason and the fix are printed.
      console.warn(
        `[skipped] FEA integration test needs ${toolchain.missing.join(' and ')}. ${toolchain.hint}`,
      );
      expect(toolchain.missing.length).toBeGreaterThan(0);
      return;
    }

    await initOcct();
    const run = await runScript({ code: SCRIPT, fileName: '<cantilever>' });
    const engine = new RecomputeEngine(createOcctLowerer(run.session));
    const lowered = await engine.run(run.records, { paramTable: run.paramTable });

    const study = findFeaStudies(run.records)[0];
    expect(study, 'the script should declare one feaStudy').toBeDefined();
    const shape = lowered.shapes.get(study.shapeId);
    expect(shape).toBeInstanceOf(OcctBackend);

    const outDir = await mkdtemp(join(tmpdir(), 'kernelcad-fea-test-'));
    try {
      const result = await runFeaStudy(
        shape as OcctBackend,
        study.metadata,
        study.shapeId,
        run.records,
        { outDir, paramTable: run.session.paramTable, toolchain },
      );
      expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      const s = result.summary;
      expect(s, 'a completed solve should produce a summary').toBeDefined();

      const deflectionError =
        Math.abs(s!.maxDisplacementMm - ANALYTIC_TIP_DEFLECTION) / ANALYTIC_TIP_DEFLECTION;
      expect(
        deflectionError,
        `tip deflection ${s!.maxDisplacementMm.toFixed(4)} mm vs analytic ${ANALYTIC_TIP_DEFLECTION.toFixed(4)} mm`,
      ).toBeLessThan(0.15);

      const stressError =
        Math.abs(s!.maxVonMisesMPa - ANALYTIC_ROOT_STRESS) / ANALYTIC_ROOT_STRESS;
      expect(
        stressError,
        `peak von Mises ${s!.maxVonMisesMPa.toFixed(2)} MPa vs analytic root bending ${ANALYTIC_ROOT_STRESS.toFixed(2)} MPa`,
      ).toBeLessThan(0.15);

      // The reaction must balance the applied load — the cheapest proof the
      // solver solved the problem the study posed.
      expect(s!.appliedForceN).toEqual([0, 0, -F]);
      expect(s!.equilibriumResidual!).toBeLessThan(1e-6);

      // Safety factor is yield / peak stress, not something else.
      expect(s!.minSafetyFactor).toBeCloseTo(250 / s!.maxVonMisesMPa, 6);

      // The peak belongs at the built-in end, not somewhere arbitrary.
      expect(s!.maxVonMisesAt[0]).toBeLessThan(L * 0.15);
      // ...and the largest movement at the free end.
      expect(s!.maxDisplacementAt[0]).toBeGreaterThan(L * 0.85);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }, 600_000);

  it('refuses to report a pass when the fixed face selector matches nothing', async () => {
    if (!toolchain.ok) {
      requireFeaToolchainIfDemanded(toolchain);
      console.warn(`[skipped] FEA integration test needs ${toolchain.missing.join(' and ')}.`);
      expect(toolchain.missing.length).toBeGreaterThan(0);
      return;
    }
    await initOcct();
    const run = await runScript({
      code: SCRIPT.replace('fixed: { atX: 0 }', 'fixed: { atX: 999 }'),
      fileName: '<cantilever-bad-fixed>',
    });
    const engine = new RecomputeEngine(createOcctLowerer(run.session));
    const lowered = await engine.run(run.records, { paramTable: run.paramTable });
    const study = findFeaStudies(run.records)[0];
    const outDir = await mkdtemp(join(tmpdir(), 'kernelcad-fea-test-'));
    try {
      const result = await runFeaStudy(
        lowered.shapes.get(study.shapeId) as OcctBackend,
        study.metadata,
        study.shapeId,
        run.records,
        { outDir, paramTable: run.session.paramTable, toolchain },
      );
      expect(result.ok).toBe(false);
      expect(result.diagnostics.map(d => d.code)).toContain('fea.study.fixed-unresolved');
      expect(result.summary).toBeUndefined();
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }, 300_000);
});
