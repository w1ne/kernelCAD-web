// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Stress-graded infill export, end to end: script -> real gmsh + CalculiX
// solve -> infill bands -> Orca/Bambu 3MF with per-region density.
//
// The solver test runs the shipped recipe (examples/fea/stress-graded-infill-
// bracket.kcad.ts). Without the toolchain it is SKIPPED and prints why; with
// KERNELCAD_REQUIRE_FEA_TOOLCHAIN=1 (the external-tools CI job) a missing
// toolchain fails instead. The no-toolchain contract (fail loudly, write
// nothing, never fall back to uniform infill) is tested on every run.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { runScript } from '../../../src/composition/runScript';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { buildStressInfillExport } from '../../../src/agent/script-runtime/stressInfillExport';
import {
  detectFeaToolchain,
  requireFeaToolchainIfDemanded,
  FEA_INSTALL_HINT,
  type FeaToolchain,
} from '../../../src/kernel/fea/toolchain';

const RECIPE = resolve(__dirname, '../../../examples/fea/stress-graded-infill-bracket.kcad.ts');
const INFILL_OPTS = {
  format: '3mf' as const,
  printer: 'bambu-a1',
  arrange: 'assembled' as const,
  infill: { fromFea: 'shelf-load' as const },
};

let toolchain: FeaToolchain;
beforeAll(async () => {
  await initOcct();
  toolchain = await detectFeaToolchain();
});

describe('stress-graded infill without a solver', () => {
  it('fails with fea.solver.unavailable and builds no modifiers', async () => {
    const code = await readFile(RECIPE, 'utf8');
    const run = await runScript({ code, fileName: 'bracket.kcad.ts', scriptDir: dirname(RECIPE) });
    const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
    const absent: FeaToolchain = { ok: false, missing: ['CalculiX (ccx)', 'gmsh (python module)'], hint: FEA_INSTALL_HINT };
    const out = await buildStressInfillExport(
      { fromFea: 'shelf-load' }, run.records, r.shapes, run.paramTable, dirname(RECIPE), absent,
    );
    expect(out.ok).toBe(false);
    const err = out.diagnostics.filter((d) => d.severity === 'error');
    expect(err.map((d) => d.code)).toEqual(['fea.solver.unavailable']);
    expect(err[0].message).toMatch(/not a pass/);
    expect('build' in out).toBe(false);
  });

  it('refuses a script with no feaStudy before touching the solver', async () => {
    const res = await runAndExport({
      code: 'return box(20, 20, 5);',
      fileName: 'plain.kcad.ts',
      format: '3mf',
      options: { format: '3mf', infill: { fromFea: true } },
    });
    expect(res.bytes.length).toBe(0);
    expect(res.diagnostics.find((d) => d.severity === 'error')?.message).toMatch(/requires a declared study/);
  });

  it('rejects an invalid band table', async () => {
    const res = await runAndExport({
      code: await readFile(RECIPE, 'utf8'),
      fileName: 'bracket.kcad.ts',
      scriptDir: dirname(RECIPE),
      format: '3mf',
      options: { format: '3mf', infill: { fromFea: true, bands: [{ name: 'x', fromYield: 0.2, densityPercent: 10 }, { name: 'y', fromYield: 0.5, densityPercent: 40 }] } },
    });
    expect(res.bytes.length).toBe(0);
    expect(res.diagnostics.find((d) => d.severity === 'error')?.message).toMatch(/fromYield must be 0/);
  });
});

describe('stress-graded infill with the real solver', () => {
  it('solves the recipe bracket and writes per-region infill modifiers', async (ctx) => {
    if (!toolchain.ok) {
      requireFeaToolchainIfDemanded(toolchain);
      console.warn(`[skipped] stress-graded infill e2e needs ${toolchain.missing.join(' and ')}. ${toolchain.hint ?? ''}`);
      ctx.skip();
      return;
    }
    const res = await runAndExport({
      code: await readFile(RECIPE, 'utf8'),
      fileName: 'bracket.kcad.ts',
      scriptDir: dirname(RECIPE),
      format: '3mf',
      options: INFILL_OPTS,
    });
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(res.bytes.length).toBeGreaterThan(0);
    const rep = res.infillReport!;
    expect(rep.study).toBe('shelf-load');
    expect(rep.bands.map((b) => [b.name, b.densityPercent, b.modifier])).toEqual([
      ['low', 10, false], ['mid', 25, true], ['high', 60, true],
    ]);
    const printed = rep.bands.reduce((a, b) => a + b.printedVolumePercent, 0);
    expect(printed).toBeCloseTo(100, 6);
    // Most of the bracket is lightly loaded; the dense band is small but real.
    expect(rep.bands[0].printedVolumePercent).toBeGreaterThan(50);
    expect(rep.bands[2].printedVolumePercent).toBeGreaterThan(0);
    expect(rep.bands[2].printedVolumePercent).toBeLessThan(10);
    expect(rep.saving.materialSavingPercent).toBeGreaterThan(10);
    expect(rep.fea.maxVonMisesMPa).toBeGreaterThan(0.4 * rep.yieldMPa);

    // The 3MF carries the modifiers with their own densities.
    const entries = unzipSync(res.bytes);
    const cfg = strFromU8(entries['Metadata/model_settings.config']);
    expect(cfg.match(/subtype="modifier_part"/g)).toHaveLength(2);
    expect(cfg).toContain('<metadata key="sparse_infill_density" value="10%"/>');
    expect(cfg).toContain('<metadata key="sparse_infill_density" value="25%"/>');
    expect(cfg).toContain('<metadata key="sparse_infill_density" value="60%"/>');

    // The dense modifier surrounds the stress peak. The object is moved by
    // the bed placement, so compare in the model frame via the report bounds.
    const model = strFromU8(entries['3D/3dmodel.model']);
    const highObj = /<object id="3"[\s\S]*?<\/object>/.exec(model)![0];
    const vs = [...highObj.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    const { min, max } = rep.boundsMm;
    const shift = [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]];
    const peak = rep.fea.maxVonMisesAt.map((c, a) => c + shift[a]);
    for (let a = 0; a < 3; a++) {
      expect(Math.min(...vs.map((v) => v[a]))).toBeLessThanOrEqual(peak[a]);
      expect(Math.max(...vs.map((v) => v[a]))).toBeGreaterThanOrEqual(peak[a]);
    }
    // Render inputs exist for the MCP layer.
    for (const p of Object.values(rep.renderScripts)) {
      expect((await readFile(p, 'utf8'))).toContain('lib.fromSTL');
    }
    expect(join(rep.outDir, 'infill-report.json')).toBeTruthy();
  }, 600_000);
});
