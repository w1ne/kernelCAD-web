// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// run_cfd against analytic results, with a real OpenFOAM. Skipped (with the
// reason printed) when no OpenFOAM is installed — CI does not need one; set
// KERNELCAD_REQUIRE_CFD_TOOLCHAIN=1 to make a missing install fail instead.
//
// 1. Hagen-Poiseuille: D = 10 mm, L = 200 mm water pipe at Re 20.
//    dp = 128 mu L Q / (pi D^4). The solve includes the inlet development
//    length (plug inlet profile), which adds about 2-3% at this Re; the
//    tolerance is 6%. Measured on OpenFOAM v2406: 0.1327 Pa vs 0.1273 Pa at
//    the solved flow rate (+4.2%), centreline speed 1.99 x mean.
// 2. Sphere drag at Re 50 (air): Schiller-Naumann Cd = 24/Re (1 + 0.15
//    Re^0.687) = 1.538; tolerance 10% for the coarse default mesh and a
//    finite domain. Measured: Cd 1.594 vs 1.542 at the solved Re 49.97 (+3.4%).

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runCfdTool } from '../../../src/agent/mcp/tools/runCfd';
import { detectCfdToolchain, requireCfdToolchainIfDemanded } from '../../../src/kernel/cfd/toolchain';

const tc = await detectCfdToolchain();
requireCfdToolchainIfDemanded(tc);
const SKIP = !tc.ok;
if (SKIP) console.warn(`[cfd validation] skipped: OpenFOAM not found. ${tc.hint ?? ''}`);

const dirs: string[] = [];
afterAll(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true });
});

describe.skipIf(SKIP)('run_cfd validation (needs OpenFOAM)', () => {
  it('matches the Hagen-Poiseuille pressure drop of a 10 mm laminar water pipe', async () => {
    const out = await mkdtemp(join(tmpdir(), 'kcad-cfd-hp-'));
    dirs.push(out);
    const r = await runCfdTool({
      code: 'return cylinder(200, 7).rotate([0, 1, 0], 90).subtract(cylinder(200, 5).rotate([0, 1, 0], 90));',
      flow: 'internal', fluid: 'water', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002,
      iterations: 600, output_dir: out,
    });
    expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true);
    const s = r.summary!;
    const mu = 998.2 * 1.004e-6;
    const D = 0.01;
    const Q = -s.patches.find(p => p.patch === 'inlet')!.flowM3s;
    const analytic = (128 * mu * 0.2 * Q) / (Math.PI * D ** 4);
    expect(s.turbulence.model).toBe('laminar');
    expect(s.mesh.ok).toBe(true);
    expect(s.massBalance.imbalance).toBeLessThan(1e-3);
    expect(Math.abs(s.pressureDropPa! / analytic - 1)).toBeLessThan(0.06);
    // Fully developed parabola: centreline = 2 x mean.
    expect(s.maxVelocity / 0.002).toBeGreaterThan(1.9);
    expect(s.maxVelocity / 0.002).toBeLessThan(2.05);
    expect(r.images?.[0]).toMatch(/velocity-midplane\.png$/);
  }, 600_000);

  it('matches the Schiller-Naumann drag coefficient of a sphere at Re 50', async () => {
    const out = await mkdtemp(join(tmpdir(), 'kcad-cfd-sphere-'));
    dirs.push(out);
    const nu = 1.511e-5;
    const r = await runCfdTool({ code: 'return sphere(5);', flow: 'external', fluid: 'air', velocity: (50 * nu) / 0.01, iterations: 600, output_dir: out });
    expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true);
    const s = r.summary!;
    const re = s.reynolds.value;
    const cdSN = (24 / re) * (1 + 0.15 * re ** 0.687);
    expect(Math.abs(s.forces!.cd / cdSN - 1)).toBeLessThan(0.1);
    expect(Math.abs(s.forces!.cl)).toBeLessThan(0.05);
    // Same inputs again: the finished run is returned, not re-solved.
    const again = await runCfdTool({ code: 'return sphere(5);', flow: 'external', fluid: 'air', velocity: (50 * nu) / 0.01, iterations: 600, output_dir: out });
    expect(again.reused).toBe('finished');
    expect(again.summary?.forces?.cd).toBe(s.forces!.cd);
  }, 600_000);
});
