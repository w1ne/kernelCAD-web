// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// CFD case generation without a solver: study validation, the fluid volume
// and its patches named from model faces, the case spec (Re, turbulence,
// background box, keep-point) and the OpenFOAM dictionaries.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildFluidDomain } from '../../../src/kernel/cfd/fluidDomain';
import { deriveCaseSpec, type CaseDerived } from '../../../src/kernel/cfd/caseSpec';
import { patchesOf, writeFoamCase } from '../../../src/kernel/cfd/foamDicts';
import { pointInside, patchStats } from '../../../src/kernel/cfd/meshGeom';
import { normalizeCfdStudy } from '../../../src/kernel/cfd/studySpec';
import { chooseTurbulence } from '../../../src/kernel/cfd/regime';
import { isKernelError } from '../../../src/shared/intent/kernelError';

beforeAll(async () => {
  await initOcct();
});

/** Tube along +X: OD 14, ID 10, length 200 (the Poiseuille geometry). */
function tube(): OcctBackend {
  const outer = OcctBackend.cylinder(200, 7).rotate([0, 1, 0], 90);
  const inner = OcctBackend.cylinder(200, 5).rotate([0, 1, 0], 90);
  return outer.subtract(inner);
}

function pipeCase(overrides: Record<string, unknown> = {}): CaseDerived {
  const meta = normalizeCfdStudy({ flow: 'internal', fluid: 'water', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002, ...overrides });
  const built = buildFluidDomain(tube(), meta, { owner: 'tube' }, 0.05);
  if (!built.ok) throw new Error(built.message);
  const d = deriveCaseSpec(built.domain, meta, 1);
  if (typeof d === 'string') throw new Error(d);
  return d;
}

describe('normalizeCfdStudy', () => {
  it('fills defaults and resolves fluid presets', () => {
    const m = normalizeCfdStudy({ flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 10 }, flowRateLpm: 1 });
    expect(m.fluid).toEqual({ name: 'water', rho: 998.2, nu: 1.004e-6 });
    expect(m.outlets).toEqual([{ atX: 10 }]);
    expect(m).toMatchObject({ fluidVolume: 'interior', meshSize: 'medium', iterations: 400, residualTarget: 1e-4, turbulence: 'auto', outletPressurePa: 0 });
    expect(normalizeCfdStudy({ flow: 'external', velocity: 5 }).fluid.name).toBe('air');
  });

  it.each([
    [{ flow: 'sideways' }, /flow/],
    [{ flow: 'internal', outlet: { atX: 1 }, velocity: 1 }, /inlet/],
    [{ flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 1 } }, /exactly one of velocity/],
    [{ flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 1 }, velocity: 1, flowRateLpm: 2 }, /exactly one of velocity/],
    [{ flow: 'external', velocity: -1 }, /velocity/],
    [{ flow: 'external', velocity: 1, fluid: 'honey' }, /fluid/],
    [{ flow: 'external', velocity: 1, iterations: 3 }, /iterations/],
    [{ flow: 'external', velocity: 1, direction: 'up' }, /direction/],
  ])('rejects %j with the shared invalid-args error', (spec, re) => {
    let err: unknown;
    try {
      normalizeCfdStudy(spec as never);
    } catch (e) {
      err = e;
    }
    expect(isKernelError(err)).toBe(true);
    expect((err as Error).message).toMatch(re);
    expect((err as { code: string }).code).toBe('feature.invalid-args');
  });
});

describe('fluid volume and patches', () => {
  it('extracts the pipe bore as the fluid and names inlet / outlet / walls from model faces', () => {
    const meta = normalizeCfdStudy({ flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002 });
    const built = buildFluidDomain(tube(), meta, { owner: 'tube' }, 0.05);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const names = built.domain.patches.map(p => [p.name, p.role]);
    expect(names).toEqual([['inlet', 'inlet'], ['outlet', 'outlet'], ['walls', 'wall']]);
    const inlet = patchStats(built.domain.patches[0].soup);
    // The inlet is the Ø10 bore opening at x = 0, not the tube's annular end.
    expect(inlet.area).toBeGreaterThan(Math.PI * 25 * 0.99);
    expect(inlet.area).toBeLessThan(Math.PI * 25 * 1.001);
    expect(inlet.centroid[0]).toBeCloseTo(0, 6);
    expect(built.domain.bounds.max[1] - built.domain.bounds.min[1]).toBeLessThan(10.01);
  });

  it('gives one patch per outlet when outlet is an array', () => {
    const block = OcctBackend.box(40, 30, 10)
      .subtract(OcctBackend.cylinder(30, 2).rotate([0, 1, 0], 90).translate(0, 15, 5))
      .subtract(OcctBackend.cylinder(12, 1.5).rotate([0, 1, 0], 90).translate(28, 8, 5))
      .subtract(OcctBackend.cylinder(12, 1.5).rotate([0, 1, 0], 90).translate(28, 22, 5))
      .subtract(OcctBackend.cylinder(18, 1.5).rotate([1, 0, 0], -90).translate(29, 6, 5));
    const meta = normalizeCfdStudy({
      flow: 'internal', inlet: { atX: 0 },
      outlet: [{ atX: 40, near: [40, 8, 5] }, { atX: 40, near: [40, 22, 5] }], flowRateLpm: 0.1,
    });
    const built = buildFluidDomain(block, meta, { owner: 'block' }, 0.05);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.domain.patches.map(p => p.name)).toEqual(['inlet', 'outlet_1', 'outlet_2', 'walls']);
  });

  it('reports an unresolved inlet with the fluid faces listed', () => {
    const meta = normalizeCfdStudy({ flow: 'internal', inlet: { atX: 55 }, outlet: { atX: 200 }, velocity: 0.002 });
    const built = buildFluidDomain(tube(), meta, { owner: 'tube' }, 0.05);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.code).toBe('cfd.study.patch-unresolved');
    expect(built.message).toMatch(/inlet selector .* matched no face of the fluid volume/);
    expect(built.message).toMatch(/Fluid faces: /);
  });

  it('reports a sealed part as having no fluid', () => {
    const meta = normalizeCfdStudy({ flow: 'internal', inlet: { atX: 0 }, outlet: { atX: 10 }, velocity: 1 });
    const built = buildFluidDomain(OcctBackend.cylinder(10, 4), meta, { owner: 'rod' }, 0.05);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe('cfd.domain.no-fluid');
  });
});

describe('case spec', () => {
  it('derives Re on the equivalent inlet diameter and picks laminar for the Poiseuille pipe', () => {
    const d = pipeCase();
    expect(d.reynolds.value).toBeGreaterThan(19.5);
    expect(d.reynolds.value).toBeLessThan(20.5);
    expect(d.regime.model).toBe('laminar');
    expect(d.spec.inlet).toEqual({ kind: 'normalSpeed', speed: 0.002 });
    expect(d.spec.outletKinematicP).toBe(0);
    // The keep-point lies inside the bore, in metres.
    expect(Math.hypot(d.spec.locationInMesh[1], d.spec.locationInMesh[2])).toBeLessThan(0.005);
    expect(d.spec.surfaceLevel).toBe(0);
  });

  it('converts a flow rate to m^3/s and the mean inlet speed', () => {
    const d = pipeCase({ velocity: undefined, flowRateLpm: 0.6 });
    expect(d.spec.inlet.kind).toBe('flowRate');
    expect(d.spec.inlet.kind === 'flowRate' ? d.spec.inlet.m3s : 0).toBeCloseTo(1e-5, 12);
    expect(d.meanInletSpeed).toBeCloseTo(1e-5 / (Math.PI * 25e-6), 2);
  });

  it('sets up external flow with inlet / outlet / slip sides and a body force monitor', () => {
    const meta = normalizeCfdStudy({ flow: 'external', velocity: 0.0756, direction: '+X' });
    const built = buildFluidDomain(OcctBackend.sphere(5), meta, { owner: 'ball' }, 0.05);
    if (!built.ok) throw new Error(built.message);
    const d = deriveCaseSpec(built.domain, meta, 1);
    if (typeof d === 'string') throw new Error(d);
    expect(d.spec.blockPatches.map(p => p.name)).toEqual(['inlet', 'outlet', 'sides', 'sides', 'sides', 'sides']);
    expect(d.spec.stlPatches).toEqual([{ name: 'body', role: 'wall' }]);
    expect(d.referenceAreaMm2).toBeGreaterThan(Math.PI * 25 * 0.98);
    expect(d.referenceAreaMm2).toBeLessThan(Math.PI * 25 * 1.02);
    expect(d.spec.forces?.patch).toBe('body');
    expect(d.dragAxis).toEqual([1, 0, 0]);
    expect(d.reynolds.value).toBeGreaterThan(49);
    expect(d.reynolds.value).toBeLessThan(51);
    // The keep-point is upstream of the body, outside it.
    expect(d.spec.locationInMesh[0]).toBeLessThan(-0.005);
    expect(pointInside({ vertices: [], triangles: [] }, [0, 0, 0])).toBe(false);
  });
});

describe('OpenFOAM dictionaries', () => {
  it('writes every case file with the study\'s patch names', () => {
    const d = pipeCase();
    const files = writeFoamCase(d.spec);
    expect(Object.keys(files).sort()).toEqual([
      '0/U', '0/p', 'constant/transportProperties', 'constant/turbulenceProperties',
      'system/blockMeshDict', 'system/controlDict', 'system/decomposeParDict', 'system/fvSchemes',
      'system/fvSolution', 'system/snappyHexMeshDict', 'system/surfaceFeatureExtractDict',
    ]);
    expect(files['system/snappyHexMeshDict']).toMatch(/inlet \{ name inlet; \}/);
    expect(files['system/snappyHexMeshDict']).toMatch(/walls \{ level \(0 0\); patchInfo \{ type wall; \} \}/);
    expect(files['0/U']).toMatch(/inlet \{ type surfaceNormalFixedValue; refValue uniform -0\.002;/);
    expect(files['0/U']).toMatch(/walls \{ type noSlip; \}/);
    expect(files['0/p']).toMatch(/outlet \{ type fixedValue; value uniform 0; \}/);
    expect(files['constant/transportProperties']).toMatch(/nu\s+0\.000001004;/);
    expect(files['constant/turbulenceProperties']).toMatch(/simulationType laminar;/);
    expect(files['system/controlDict']).toMatch(/inlet_flow[\s\S]*operation sum; fields \(phi\);/);
    expect(files['system/controlDict']).toMatch(/outlet_p[\s\S]*operation areaAverage; fields \(p\);/);
    expect(files['system/controlDict']).toMatch(/endTime {9}400;/);
    expect(files['system/fvSchemes']).toMatch(/linearUpwind grad\(U\)/);
    expect(patchesOf(d.spec, 'background')).toEqual(['background']);
  });

  it('adds k / omega / nut and wall functions for k-omega SST', () => {
    const d = pipeCase({ turbulence: 'kOmegaSST' });
    const files = writeFoamCase(d.spec);
    expect(files['constant/turbulenceProperties']).toMatch(/RASModel kOmegaSST;/);
    expect(files['0/k']).toMatch(/walls \{ type kqRWallFunction;/);
    expect(files['0/omega']).toMatch(/walls \{ type omegaWallFunction;/);
    expect(files['0/nut']).toMatch(/walls \{ type nutkWallFunction;/);
    expect(files['system/fvSolution']).toMatch(/"\(k\|omega\)" 0\.0001;/);
    expect(files['system/fvSchemes']).toMatch(/limitedLinearV 1/);
    expect(d.regime.caveat).toMatch(/contradicts Re/);
  });

  it('is byte-stable for the same input (the job cache keys on it)', () => {
    expect(writeFoamCase(pipeCase().spec)).toEqual(writeFoamCase(pipeCase().spec));
  });
});

describe('flow regime', () => {
  it('uses the textbook thresholds and says why', () => {
    expect(chooseTurbulence('internal', 1500, 'auto').model).toBe('laminar');
    const transitional = chooseTurbulence('internal', 3000, 'auto');
    expect(transitional.model).toBe('kOmegaSST');
    expect(transitional.caveat).toMatch(/transition/);
    expect(chooseTurbulence('internal', 1e5, 'auto').model).toBe('kOmegaSST');
    expect(chooseTurbulence('external', 50, 'auto')).toMatchObject({ model: 'laminar', chosen: 'auto' });
    expect(chooseTurbulence('external', 500, 'auto').caveat).toMatch(/sheds vortices/);
    expect(chooseTurbulence('external', 5e4, 'auto').model).toBe('kOmegaSST');
    expect(chooseTurbulence('internal', 100, 'laminar')).toMatchObject({ chosen: 'user' });
  });
});
