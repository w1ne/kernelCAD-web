// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The evaluate-time FEA gate on a host WITHOUT CalculiX (the hosted case)
// falls back to the synchronous in-process voxel solver, so it must stay
// bounded: a 200 x 200 x 2 plate used to voxelize into 80,000 bricks (the
// 20,000-brick ceiling only applied to an explicit meshSize), block evaluate
// for ~2 minutes and then blame the user's mesh size (fea.mesh.too-large).
//
// The toolchain probe is mocked absent so this runs the hosted path on any
// machine.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../../../src/kernel/fea/toolchain', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../src/kernel/fea/toolchain')>();
  return {
    ...orig,
    detectFeaToolchain: async () => ({ ok: false, missing: ['ccx', 'gmsh'], hint: orig.FEA_INSTALL_HINT }),
  };
});

import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { GATE_IN_PROCESS_TARGET_ELEMENTS, runFeaGateOnModel } from '../../../src/modeling/runtime/fea/runFeaGate';
import { findFeaStudies } from '../../../src/modeling/runtime/fea/findFeaStudies';
import { runFeaStudyRefined } from '../../../src/kernel/fea/autoRefine';
import { IN_PROCESS_MAX_ELEMENTS, inProcessBrickSize } from '../../../src/kernel/fea/inProcess/runInProcessFea';

beforeAll(async () => {
  await initOcct();
}, 60_000);

const PLATE = `const b = box(200, 200, 2);
b.feaStudy({ name: 'p', material: 'steel', fixed: { atX: 0 }, loads: [{ faces: { atX: 200 }, force: [0, 0, -10] }], minSafetyFactor: 2 });
return b;`;

// 60 x 12 x 3 PLA tab, 250 N at the tip: far past yield (SF << 1).
const OVERLOADED_TAB = `const tab = box(60, 12, 3);
tab.feaStudy({ name: 'tab', material: 'pla', fixed: { atX: 0 }, loads: [{ faces: { atX: 60 }, force: [0, 0, -250] }], minSafetyFactor: 2 });
return tab;`;

describe('inProcessBrickSize', () => {
  it('never sizes past the element ceiling, and flags a plate too thin for two bricks through under it', () => {
    const plate = inProcessBrickSize([0, 0, 0], [200, 200, 2], 200 * 200 * 2, undefined);
    expect(plate.tooThin).toBe(true);
    expect(plate.bricksForTwoThrough).toBe(80_000);
    // Even when it is not refused, the grid it would build is under the ceiling.
    expect((200 * 200 * 2) / plate.size ** 3).toBeLessThanOrEqual(IN_PROCESS_MAX_ELEMENTS * 1.0001);

    const tab = inProcessBrickSize([0, 0, 0], [60, 12, 3], 60 * 12 * 3, undefined);
    expect(tab.tooThin).toBe(false);
    expect(tab.size).toBeLessThanOrEqual(1.5); // two bricks through 3 mm
    const fine = inProcessBrickSize([0, 0, 0], [60, 12, 3], 60 * 12 * 3, 0.01);
    expect(fine.clamped).toBe(true);
    expect((60 * 12 * 3) / fine.size ** 3).toBeLessThanOrEqual(IN_PROCESS_MAX_ELEMENTS * 1.0001);
  });
});

describe('evaluate-time FEA gate without CalculiX', () => {
  it('refuses a 200 x 200 x 2 plate in well under a few seconds, as too thin (not as a too-fine mesh)', async () => {
    const m = await buildModel({ fileName: 'plate.kcad.ts', code: PLATE });
    const t = Date.now();
    const r = await runFeaGateOnModel(m);
    const ms = Date.now() - t;
    expect(ms).toBeLessThan(3_000);
    const codes = r!.diagnostics.map(d => d.code);
    expect(codes).not.toContain('fea.mesh.too-large');
    const d = r!.diagnostics.find(x => x.code === 'fea.solver.unavailable');
    expect(d?.message).toMatch(/too thin for the in-process solver/);
    expect(d?.message).toMatch(/2\.00 mm/);
    expect(d?.message).toMatch(/NOT a pass/);
    expect(r!.summaries).toEqual([]);
  }, 60_000);

  it('still fails a clearly overloaded part on the gate\'s coarse default grid', async () => {
    const m = await buildModel({ fileName: 'tab.kcad.ts', code: OVERLOADED_TAB });
    // A generous budget here so a loaded CI box cannot turn the verdict into
    // a timeout; the budget path itself is the next test. ~1-2 s standalone.
    const prev = process.env.KERNELCAD_FEA_GATE_SOLVE_MS;
    process.env.KERNELCAD_FEA_GATE_SOLVE_MS = '30000';
    let r;
    try {
      r = await runFeaGateOnModel(m);
    } finally {
      if (prev === undefined) delete process.env.KERNELCAD_FEA_GATE_SOLVE_MS;
      else process.env.KERNELCAD_FEA_GATE_SOLVE_MS = prev;
    }
    expect(r!.summaries[0].elementCount).toBeLessThanOrEqual(GATE_IN_PROCESS_TARGET_ELEMENTS * 1.25); // voxel rounding
    const below = r!.diagnostics.find(d => d.code === 'fea.safety-factor.below-min');
    expect(below?.severity).toBe('error');
    expect(r!.summaries[0].solver).toBe('in-process-voxel');
  }, 60_000);

  it('a solve that runs out of the gate budget is UNVERIFIED (warn), not an error blaming the mesh', async () => {
    const m = await buildModel({ fileName: 'tab.kcad.ts', code: OVERLOADED_TAB });
    const [study] = findFeaStudies(m.records);
    const shape = m.shapes.get(study.shapeId) as OcctBackend;
    const outDir = await mkdtemp(join(tmpdir(), 'kc-fea-budget-'));
    try {
      const gate = await runFeaStudyRefined(shape, study.metadata, study.shapeId, m.records, {
        outDir, refine: false, inProcessSolveTimeoutMs: 1, inProcessOnTimeout: 'unverified',
      });
      expect(gate.summary).toBeUndefined();
      expect(gate.diagnostics.map(d => `${d.code}/${d.severity}`)).toEqual(['fea.safety-factor.unverified/warn']);
      expect(gate.diagnostics[0].message).toMatch(/UNVERIFIED — neither passed nor failed/);
      expect(gate.diagnostics[0].hint).toMatch(/Nothing is wrong with the model or its meshSize/);
      // run_fea keeps the error contract, but says it ran out of time.
      const tool = await runFeaStudyRefined(shape, study.metadata, study.shapeId, m.records, {
        outDir, refine: false, inProcessSolveTimeoutMs: 1,
      });
      expect(tool.ok).toBe(false);
      expect(tool.diagnostics[0].code).toBe('fea.mesh.too-large');
      expect(tool.diagnostics[0].message).toMatch(/ran out of its 0 s budget|ran out of its/);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }, 60_000);
});
