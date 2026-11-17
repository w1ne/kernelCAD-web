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
import {
  HEX_BOLT_PARTIAL_HEAD,
  HEX_BOLT_PARTIAL_LENGTHS,
} from '../../../src/modeling/parts/familyTable';

const NO_GATES = { interference: false, mountingHoles: false, jointAxis: false } as const;

describe('standard-part range declarations (S3)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('declares a domain, requirements and catalog attributes for the first slice', () => {
    expect(STANDARD_PART_RANGES).toHaveLength(11);
    const members = STANDARD_PART_RANGES.map((d) => d.member);
    expect(members).toEqual([
      'boltSHCS', 'boltBHCS', 'boltFlatHead', 'boltHex', 'boltHexPartial', 'setScrew', 'rodThreaded',
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

  it('sweeps boltHexPartial across every stocked thread and length', async () => {
    const declaration = STANDARD_PART_RANGES.find((d) => d.member === 'boltHexPartial')!;
    const threads = Object.keys(HEX_BOLT_PARTIAL_LENGTHS).map((key) => key.replace('_', '.'));
    expect(declaration.parameters.find((p) => p.name === 'Thread')!.values).toEqual(threads);

    let points = 0;
    for (const thread of threads) {
      const key = thread.replace('.', '_');
      const stocked = HEX_BOLT_PARTIAL_LENGTHS[key]!;
      const head = HEX_BOLT_PARTIAL_HEAD[key]!;
      const nominal = Number.parseFloat(thread.slice(1));
      const xMax = Math.ceil(Math.max(head.D, nominal)) + 1;
      const headExtra = Math.ceil(head.K + 1);
      const choices = stocked.map(String);
      const script = `
const Length = param('Length', ${JSON.stringify(choices[0])}, { choices: ${JSON.stringify(choices)} });
const L = Number(Length.value);
const part = await lib.standard.boltHexPartial({ thread: ${JSON.stringify(thread)}, lengthMm: L, detail: 'envelope' });
require('boltHexPartial.length-envelope', bbox(part).within({ x: [0, ${xMax}], y: [0, ${xMax}], z: [0, L + ${headExtra}] }));
require('boltHexPartial.material', volume(part).gte(1));
return part;
`;
      const result = await sweepTolerance({
        code: script,
        params: { Length: { values: choices } },
        gates: NO_GATES,
        boundaryBudget: 0,
      }, defaultSweepEvaluator);

      expect(result.ok, thread).toBe(true);
      expect(result.combosEvaluated).toBe(stocked.length);
      expect(result.boundaries).toHaveLength(0);
      for (const row of result.results) {
        expect(row.requirements.map((r) => r.status)).toEqual(['pass', 'pass']);
      }
      points += result.combosEvaluated;
    }
    // M2 2, M2.5 3, M3 3, M4 4, M5 6, M6 7, M8 8, M10 9, M12 10.
    expect(points).toBe(52);

    const refused = await sweepTolerance({
      code: `
const Length = param('Length', '16', { choices: ['16'] });
const part = await lib.standard.boltHexPartial({ thread: 'M6', lengthMm: Number(Length.value), detail: 'envelope' });
require('boltHexPartial.material', volume(part).gte(1));
return part;
`,
      params: { Length: { values: ['16'] } },
      gates: NO_GATES,
      boundaryBudget: 0,
    }, defaultSweepEvaluator);
    expect(refused.ok).toBe(false);
    expect(refused.results[0]?.diagnostics.map((d) => d.message).join('\n')).toMatch(/ISO 4017/);
  });
});
