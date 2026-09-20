// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation tests for `computeFeaSummary`: pin the exact summary
// object, property order, trust reasons and the numeric edge cases before the
// function is split by phase. No solver toolchain is involved — the function
// is pure.
import { describe, expect, it } from 'vitest';
import type { OcctBackend } from '../backends/occt/occtBackend';
import { computeFeaSummary } from './runFea';
import type { FeaFieldResult, FeaMesh, FeaMeshQuality, FeaResolvedLoad, FeaSurface } from './types';
import type { FeaStudyMetadata } from '../../shared/intent/feaStudyRecord';

const MATERIAL = { ok: true as const, name: 'custom', props: { E: 200_000, nu: 0.3, yield: 250 } };
const QUALITY: FeaMeshQuality = {
  minSICN: 0.5,
  meanSICN: 0.7,
  lowQualityCount: 0,
  lowQualityThreshold: 0.1,
};

function ctxFor(study: FeaStudyMetadata) {
  return {
    shape: {} as OcctBackend,
    study,
    owner: 'fea-1',
    records: undefined,
    opts: { outDir: '/tmp/fea-characterisation' },
    diagnostics: [],
    artifacts: {},
  };
}

describe('computeFeaSummary — characterisation', () => {
  it('folds global, per-region and equilibrium numbers into the summary', () => {
    const nodes = new Map<number, readonly [number, number, number]>([
      [1, [0, 0, 0]],
      [2, [10, 0, 0]],
      [3, [0, 10, 0]],
    ]);
    const mesh: FeaMesh = {
      nodes,
      elements: [
        { id: 1, nodes: [1, 2, 3] },
        { id: 2, nodes: [2, 3, 1] },
      ],
      surfaces: [],
      quality: QUALITY,
      meshSize: 2.5,
    };
    const labelled: FeaSurface[] = [
      { tag: 7, centroid: [5, 0, 0], area: 50, nodes: [1, 2], tris: [], ref: '@kc[face:top]' },
      { tag: 9, centroid: [0, 10, 0], area: 25, nodes: [3], tris: [] },
    ];
    const fields: FeaFieldResult = {
      nodeIds: [1, 2, 3, 4],
      displacement: [
        [0, 0, 1],
        [2, 0, 0],
        [0, 0, 0],
        [1, 1, 1],
      ],
      vonMises: [100, 250, 50, 175],
      stressErrorPercent: [3, 30, 5],
    };
    const loads: FeaResolvedLoad[] = [
      { name: 'push', set: { name: 'tip', nodes: [1, 2] }, force: [100, 0, -50] },
      { name: 'side', set: { name: 'web', nodes: [3] }, force: [0, 25, -25] },
    ];
    const study: FeaStudyMetadata = {
      name: 'cantilever',
      material: 'mild-steel',
      fixed: '@kc[face:root]',
      loads: [],
      meshSize: 2.5,
      minSafetyFactor: 1.5,
      virtual: true,
    };

    const result = computeFeaSummary(
      ctxFor(study), MATERIAL, { mesh, volumeCount: 1, meshMs: 56 }, labelled, fields,
      { totalReactionForce: [-100, -25, 50] }, loads, 2.5, 1234,
    );

    expect(result.summary).toEqual({
      study: 'cantilever',
      material: { name: 'custom', E: 200_000, nu: 0.3, yield: 250 },
      maxVonMisesMPa: 250,
      maxVonMisesAt: [10, 0, 0],
      maxDisplacementMm: 2,
      maxDisplacementAt: [10, 0, 0],
      minSafetyFactor: 1,
      minSafetyFactorRequired: 1.5,
      nodeCount: 3,
      elementCount: 2,
      meshSizeMm: 2.5,
      quality: QUALITY,
      maxStressErrorPercent: 30,
      trust: {
        meshTrusted: false,
        reasons: [
          "the solver's own nodal stress-error estimate peaks at 30.0% (above 25%), so the peak stress is mesh-limited",
        ],
      },
      hotSpots: [
        { region: '@kc[face:top]', maxVonMisesMPa: 250, nodeId: 2, at: [10, 0, 0], safetyFactor: 1 },
        { region: 'surface#9', maxVonMisesMPa: 50, nodeId: 3, at: [0, 10, 0], safetyFactor: 5 },
      ],
      appliedForceN: [100, 25, -75],
      reactionForceN: [-100, -25, 50],
      equilibriumResidual: 25 / Math.hypot(100, 25, 75),
      solveMs: 1234,
      meshMs: 56,
    });
    expect(Object.keys(result.summary)).toEqual([
      'study',
      'material',
      'maxVonMisesMPa',
      'maxVonMisesAt',
      'maxDisplacementMm',
      'maxDisplacementAt',
      'minSafetyFactor',
      'minSafetyFactorRequired',
      'nodeCount',
      'elementCount',
      'meshSizeMm',
      'quality',
      'maxStressErrorPercent',
      'trust',
      'hotSpots',
      'appliedForceN',
      'reactionForceN',
      'equilibriumResidual',
      'solveMs',
      'meshMs',
    ]);
    expect(result.maxVm).toBe(250);
    expect(result.maxDisp).toBe(2);
    expect(result.minSafetyFactor).toBe(1);
    expect(result.yieldMPa).toBe(250);
    expect(result.hotSpots).toEqual(result.summary.hotSpots);
  });

  it('keeps the empty-field edge values (Infinity safety factor, no residual)', () => {
    const mesh: FeaMesh = {
      nodes: new Map(),
      elements: [],
      surfaces: [],
      quality: { minSICN: -0.1, meanSICN: 0.2, lowQualityCount: 0, lowQualityThreshold: 0.1 },
      meshSize: 4,
    };
    const fields: FeaFieldResult = {
      nodeIds: [],
      displacement: [],
      vonMises: [],
      stressErrorPercent: [],
    };
    const study: FeaStudyMetadata = {
      name: 'empty',
      material: 'mild-steel',
      fixed: '@kc[face:root]',
      loads: [],
      virtual: true,
    };

    const result = computeFeaSummary(
      ctxFor(study), MATERIAL, { mesh, volumeCount: 0, meshMs: 7 }, [], fields, {}, [], 4, 5,
    );

    expect(result.summary).toEqual({
      study: 'empty',
      material: { name: 'custom', E: 200_000, nu: 0.3, yield: 250 },
      maxVonMisesMPa: 0,
      maxVonMisesAt: [0, 0, 0],
      maxDisplacementMm: 0,
      maxDisplacementAt: [0, 0, 0],
      minSafetyFactor: Infinity,
      nodeCount: 0,
      elementCount: 0,
      meshSizeMm: 4,
      quality: { minSICN: -0.1, meanSICN: 0.2, lowQualityCount: 0, lowQualityThreshold: 0.1 },
      trust: {
        meshTrusted: false,
        reasons: ['mesh contains inverted or degenerate elements (minSICN -0.100)'],
      },
      hotSpots: [],
      appliedForceN: [0, 0, 0],
      solveMs: 5,
      meshMs: 7,
    });
    expect(result.summary.maxStressErrorPercent).toBeUndefined();
    expect(result.summary.minSafetyFactorRequired).toBeUndefined();
    expect(result.summary.reactionForceN).toBeUndefined();
    expect(result.summary.equilibriumResidual).toBeUndefined();
    expect(result.minSafetyFactor).toBe(Infinity);
  });
});
