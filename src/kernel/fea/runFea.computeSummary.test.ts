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
          "the solver's own nodal stress-error estimate in the high-stress region peaks at 30.0% (above 25%), so the peak stress is mesh-limited",
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

  describe('support zone', () => {
    // Five nodes in a row; nodes 1 and 2 sit on the clamp edge. Node 1 holds
    // the singular spike.
    const nodes = new Map<number, readonly [number, number, number]>([
      [1, [0, 0, 0]], [2, [1, 0, 0]], [3, [2, 0, 0]], [4, [3, 0, 0]], [5, [4, 0, 0]],
    ]);
    const mesh: FeaMesh = { nodes, elements: [], surfaces: [], quality: QUALITY, meshSize: 1 };
    const labelled: FeaSurface[] = [
      { tag: 1, centroid: [0, 0, 0], area: 1, nodes: [1, 2], tris: [], ref: '@kc[face:bore]' },
      { tag: 2, centroid: [3, 0, 0], area: 1, nodes: [3, 4, 5], tris: [], ref: '@kc[face:web]' },
    ];
    const fields: FeaFieldResult = {
      nodeIds: [1, 2, 3, 4, 5],
      displacement: [[0, 0, 0], [0, 0, 0], [0, 0, 0.1], [0, 0, 0.2], [0, 0, 0.3]],
      vonMises: [240, 180, 100, 120, 20],
      stressErrorPercent: [60, 40, 10, 12, 80],
    };
    const study: FeaStudyMetadata = {
      name: 'clamped', material: 'mild-steel', fixed: '@kc[face:bore]', loads: [], virtual: true,
    };
    const run = (adjacent: number[]) => computeFeaSummary(
      ctxFor(study), MATERIAL, { mesh, volumeCount: 1, meshMs: 1 }, labelled, fields, {}, [], 1, 1,
      { adjacent: new Set(adjacent), radiusMm: { min: 0.8, max: 1.6 } },
    );

    it('governs on the field away from the clamp edge and keeps the raw peak beside it', () => {
      const { summary } = run([1, 2]);
      expect(summary.maxVonMisesMPa).toBe(120);
      expect(summary.maxVonMisesAt).toEqual([3, 0, 0]);
      expect(summary.minSafetyFactor).toBeCloseTo(250 / 120, 12);
      expect(summary.governingField).toBe('away-from-supports');
      expect(summary.supportAdjacentNodeCount).toBe(2);
      expect(summary.supportZoneRadiusMm).toEqual({ min: 0.8, max: 1.6 });
      expect(summary.peakAtSupportMPa).toBe(240);
      expect(summary.peakAtSupportAt).toEqual([0, 0, 0]);
      expect(summary.peakAtSupportRegion).toBe('@kc[face:bore]');
      expect(summary.maxStressErrorAtSupportPercent).toBe(60);
      // Hot spots come from the governing field only.
      expect(summary.hotSpots.map(h => [h.region, h.maxVonMisesMPa])).toEqual([['@kc[face:web]', 120]]);
      // Trust reads the error estimate where the governing stress is high
      // (>= 60 MPa here): 10 and 12 %, not the 80 % at the 20 MPa node or the
      // 60 % at the singular node.
      expect(summary.maxStressErrorPercent).toBe(12);
      expect(summary.trust.meshTrusted).toBe(true);
      // Displacement is not filtered.
      expect(summary.maxDisplacementMm).toBeCloseTo(0.3, 12);
    });

    it('falls back to the raw field when the zone covers more than half the part', () => {
      const { summary } = run([1, 2, 3]);
      expect(summary.governingField).toBe('all-nodes');
      expect(summary.maxVonMisesMPa).toBe(240);
      expect(summary.peakAtSupportMPa).toBe(240);
      expect(summary.hotSpots[0].region).toBe('@kc[face:bore]');
    });

    it('adds no support fields when the zone is empty', () => {
      const { summary } = run([]);
      expect(summary.maxVonMisesMPa).toBe(240);
      expect(summary.governingField).toBeUndefined();
      expect(summary.peakAtSupportMPa).toBeUndefined();
    });
  });
});
