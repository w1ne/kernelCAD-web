// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { sweepTolerance } from '../../../src/kinematic/sweepTolerance';
import { defaultSweepEvaluator } from '../../../src/composition/scriptEvaluation';
import {
  STANDARD_PART_RANGES,
  STANDARD_PART_RANGE_REMAINING,
  standardPartVerificationAttributes,
} from '../../../src/modeling/parts/standardPartRanges';
import { loadCatalog, resolveById } from '../../../src/modeling/parts/catalog';

const NO_GATES = { interference: false, mountingHoles: false, jointAxis: false } as const;

describe('standard-part range declarations (S3)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('declares a domain, requirements and catalog attributes for the first slice', () => {
    expect(STANDARD_PART_RANGES).toHaveLength(10);
    const members = STANDARD_PART_RANGES.map((d) => d.member);
    expect(members).toEqual([
      'boltSHCS', 'boltBHCS', 'boltFlatHead', 'boltHex', 'setScrew', 'rodThreaded',
      'nutHex', 'nutLock', 'washerFlat', 'washerLock',
    ]);
    for (const declaration of STANDARD_PART_RANGES) {
      expect(declaration.parameters.length).toBeGreaterThan(0);
      expect(declaration.requirements.map((r) => r.name)).toEqual(['envelope', 'material']);
      expect(declaration.cases.length).toBeGreaterThan(0);
      expect(Number(declaration.catalogAttributes.verifiedPoints)).toBe(
        declaration.cases.reduce((sum, c) => sum + c.expectedPoints, 0),
      );
      expect(declaration.catalogAttributes.verifiedBoundaries).toMatch(/0/);
      expect(declaration.catalogAttributes.verifiedMethod).toMatch(/checked, not proven/);
    }
  });

  it('lists the remaining standard parts instead of claiming them verified', () => {
    const covered = new Set(STANDARD_PART_RANGES.map((d) => d.member));
    expect(STANDARD_PART_RANGE_REMAINING).toHaveLength(12);
    for (const member of STANDARD_PART_RANGE_REMAINING) {
      expect(covered.has(member as never)).toBe(false);
    }
    expect(standardPartVerificationAttributes('socket-head-cap-screw')).toBeDefined();
    expect(standardPartVerificationAttributes('ball-bearing')).toBeUndefined();
  });

  it('shows the checked range on the committed catalog seed record', () => {
    const hit = resolveById(loadCatalog(), 'iso-4762-m2x4');
    expect(hit).toBeDefined();
    expect(hit!.record.attributes).toMatchObject({
      verifiedMethod: 'S3 sweep; checked, not proven',
      verifiedThreadPoints: '9',
      verifiedBoundaries: '0 (discrete domain)',
      verifiedPoints: '12',
    });
  });

  it('runs a thread domain through the S3 sweep with every requirement passing', async () => {
    const declaration = STANDARD_PART_RANGES.find((d) => d.member === 'boltSHCS')!;
    const threadCase = declaration.cases.find((c) => c.parameter === 'Thread')!;
    const result = await sweepTolerance({
      code: threadCase.script,
      params: threadCase.params,
      gates: NO_GATES,
      boundaryBudget: 0,
    }, defaultSweepEvaluator);

    expect(result.ok).toBe(true);
    expect(result.combosEvaluated).toBe(threadCase.expectedPoints);
    expect(result.boundaries).toHaveLength(0);
    for (const row of result.results) {
      expect(row.requirements.map((r) => [r.name, r.status])).toEqual([
        ['boltSHCS.envelope', 'pass'],
        ['boltSHCS.material', 'pass'],
      ]);
    }
    expect(result.coverage.statement).toMatch(/sampled, not a proof/);
  });

  it('runs a sampled length domain through the S3 sweep with every requirement passing', async () => {
    const declaration = STANDARD_PART_RANGES.find((d) => d.member === 'boltBHCS')!;
    const lengthCase = declaration.cases.find((c) => c.parameter === 'Length')!;
    const result = await sweepTolerance({
      code: lengthCase.script,
      params: lengthCase.params,
      gates: NO_GATES,
      boundaryBudget: 0,
    }, defaultSweepEvaluator);

    expect(result.ok).toBe(true);
    expect(result.combosEvaluated).toBe(lengthCase.expectedPoints);
    expect(result.boundaries).toHaveLength(0);
    for (const row of result.results) {
      expect(row.requirements.every((r) => r.status === 'pass')).toBe(true);
    }
  });
});
