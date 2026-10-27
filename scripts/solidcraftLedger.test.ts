// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  assertRunLimits,
  attributionGaps,
  bboxDiagonal,
  compareSolidCraftMetrics,
  corpusMismatch,
  effectiveTolerances,
  loadLedger,
  renderLedger,
  selectCases,
  summarizeLedger,
  unsupportedOracleFields,
  type LedgerCase,
  type LedgerManifest,
  type LedgerRunResult,
  type SolidCraftExpected,
  type ToleranceSpec,
} from './solidcraftLedger';

const tolerances: ToleranceSpec = {
  volumeRelative: 0.001,
  surfaceAreaRelative: 0.001,
  bboxAbsoluteFloorMm: 0.05,
  bboxRelativeOfDiagonal: 0.001,
  centerOfMassAbsoluteFloorMm: 0.05,
  centerOfMassRelativeOfDiagonal: 0.001,
  notes: 'Volume and area use relative 1e-3. Bbox and centre of mass use max(0.05 mm, 0.001 × diagonal).',
};

const expected: SolidCraftExpected = {
  volumeMm3: 1000,
  surfaceAreaMm2: 600,
  centerOfMass: [5, 5, 5],
  bbox: { min: [0, 0, 0], max: [10, 10, 10] },
};

function entry(overrides: Partial<LedgerCase> & Pick<LedgerCase, 'id' | 'status' | 'ci'>): LedgerCase {
  return {
    name: overrides.id,
    expected,
    provenance: { kind: 'analytic', upstream: 'analytic', details: 'fixture formula' },
    bodyCount: 1,
    ...overrides,
  };
}

function manifest(cases: LedgerCase[]): LedgerManifest {
  return {
    schemaVersion: 1,
    source: {
      project: 'SolidCraft',
      url: 'https://github.com/tangency-labs/solidcraft',
      commit: 'a'.repeat(40),
      committedAt: '2026-10-27 17:16:40 -0400',
      license: 'Apache-2.0',
      licenseNote: 'Used under the Apache-2.0 terms.',
    },
    units: { length: 'mm', volume: 'mm^3', surfaceArea: 'mm^2' },
    tolerances,
    limits: { perPartMs: 20000, prTotalMs: 60000, nightlyPerPartMs: 60000, nightlyTotalMs: 2_700_000 },
    cases,
  };
}

describe('solidcraft metric comparison', () => {
  const limits = effectiveTolerances(expected, tolerances);

  it('accepts volume, area, bbox, and centre of mass inside the declared tolerances', () => {
    const result = compareSolidCraftMetrics(
      {
        volumeMm3: 1000.5,
        surfaceAreaMm2: 600.3,
        centerOfMass: [5.02, 5, 4.99],
        bbox: { min: [0.01, 0, 0], max: [10.04, 10, 10] },
      },
      expected,
      limits,
    );
    expect(result.pass).toBe(true);
    expect(result.volumeRelativeError).toBeCloseTo(0.0005);
    expect(result.centerOfMassMaxAbsoluteErrorMm).toBeCloseTo(0.02);
    expect(result.bboxMaxAbsoluteErrorMm).toBeCloseTo(0.04);
  });

  it('fails when only the centre of mass is outside its tolerance', () => {
    const result = compareSolidCraftMetrics(
      { ...expected, centerOfMass: [5.2, 5, 5] },
      expected,
      limits,
    );
    expect(result.pass).toBe(false);
    expect(result.volumePass).toBe(true);
    expect(result.centerOfMassPass).toBe(false);
  });

  it('uses the looser of the 0.05 mm floor and 1e-3 of the bbox diagonal', () => {
    const small = effectiveTolerances(expected, tolerances);
    expect(bboxDiagonal(expected.bbox)).toBeCloseTo(Math.sqrt(300));
    expect(small.bboxAbsoluteMm).toBe(0.05);
    const large = effectiveTolerances(
      { ...expected, bbox: { min: [0, 0, 0], max: [200, 0, 0] } },
      tolerances,
    );
    expect(large.bboxAbsoluteMm).toBeCloseTo(0.2);
    expect(large.centerOfMassAbsoluteMm).toBeCloseTo(0.2);
  });
});

describe('solidcraft ledger gate', () => {
  const pass = { expectedStatus: 'pass' as const, status: 'PASS' as const };
  const regressed = { expectedStatus: 'pass' as const, status: 'FAIL' as const };
  const known = { expectedStatus: 'known-failure' as const, status: 'KNOWN FAIL' as const };
  const cleared = { expectedStatus: 'known-failure' as const, status: 'PASS' as const };
  const crashed = { expectedStatus: 'known-failure' as const, status: 'FAIL' as const };

  it('passes when every executed pass matches, including a different number of them', () => {
    expect(summarizeLedger([pass]).gatePass).toBe(true);
    expect(summarizeLedger([pass, pass, known, cleared]).gatePass).toBe(true);
  });

  it('does not fail because a pending row was recorded, even if that row is marked FAIL', () => {
    const withPending = summarizeLedger([
      pass,
      { expectedStatus: 'pending', status: 'FAIL' },
      { expectedStatus: 'pending', status: 'PASS' },
    ]);
    expect(withPending.gatePass).toBe(true);
    expect(withPending.unexpectedFailureCount).toBe(0);
    expect(withPending.expectedPassCount).toBe(1);
  });

  it('fails when an executed pass regresses or a known failure throws', () => {
    expect(summarizeLedger([regressed, known]).gatePass).toBe(false);
    expect(summarizeLedger([pass, crashed]).unexpectedFailureCount).toBe(1);
    expect(summarizeLedger([pass, crashed]).gatePass).toBe(false);
  });

  it('selects implemented cases for the requested tier and skips pending rows', () => {
    const cases = [
      entry({ id: 'fast', ci: 'pr', status: 'pass', source: 'fast.kcad.ts' }),
      entry({ id: 'slow', ci: 'nightly', status: 'pass', source: 'slow.kcad.ts' }),
      entry({ id: 'later', ci: 'pr', status: 'pending' }),
      entry({ id: 'sheet', ci: 'nightly', status: 'pending' }),
    ];
    expect(selectCases(cases, 'pr').map((item) => item.id)).toEqual(['fast']);
    expect(selectCases(cases, 'all').map((item) => item.id)).toEqual(['fast', 'slow']);
  });

  it('keeps the PR budget at or below 60 seconds', () => {
    expect(() => assertRunLimits({ perPartMs: 20000, prTotalMs: 60000, nightlyPerPartMs: 60000, nightlyTotalMs: 61000 })).not.toThrow();
    expect(() => assertRunLimits({ perPartMs: 20000, prTotalMs: 60001, nightlyPerPartMs: 60000, nightlyTotalMs: 120000 })).toThrow(/60000/);
  });
});

describe('solidcraft ledger report', () => {
  it('lists pending and nightly rows without calling them failures', () => {
    const cases = [
      entry({ id: 'fast', ci: 'pr', status: 'pass', source: 'fast.kcad.ts' }),
      entry({ id: 'slow', ci: 'nightly', status: 'known-failure', source: 'slow.kcad.ts', knownFailureReason: 'Corner patch differs.' }),
      entry({ id: 'later', ci: 'nightly', status: 'pending' }),
    ];
    const measured: LedgerRunResult = {
      id: 'fast',
      expectedStatus: 'pass',
      status: 'PASS',
      elapsedMs: 3,
      comparison: compareSolidCraftMetrics(expected, expected, effectiveTolerances(expected, tolerances)),
    };
    const report = renderLedger(manifest(cases), [measured]);
    expect(report).toContain('**Gate:** PASS');
    expect(report).toContain('Unexpected failures: 0');
    expect(report).toContain('| fast |');
    expect(report).toContain('| PASS |');
    expect(report).toContain('| later |');
    expect(report).toContain('| PENDING |');
    expect(report).toContain('| slow |');
    expect(report).toContain('| NOT RUN |');
    expect(report).toContain('Reason: Corner patch differs.');
    expect(report).toContain('does not lock a pass-count baseline');
  });
});

describe('solidcraft corpus alignment', () => {
  it('reports ids that are only on one side and accepts the same set', () => {
    expect(corpusMismatch(['a', 'b'], ['b', 'a'])).toBeUndefined();
    expect(corpusMismatch(['a'], ['a', 'b'])).toContain('missing rows [b]');
    expect(corpusMismatch(['a', 'c'], ['a'])).toContain('missing files [c]');
  });

  it('names oracle fields this pin does not interpret yet', () => {
    expect(unsupportedOracleFields({})).toBeUndefined();
    expect(unsupportedOracleFields({ tolerance: { rel: 0.01 } })).toBe('per-case tolerance');
    expect(unsupportedOracleFields({ compare: ['volume_mm3'] })).toBe('compare subset');
  });

  it('requires the commit and the upstream URL in every attribution file', () => {
    const commit = '7a6c884418698e9c9fb0e6f97b9b847998c58c49';
    const url = 'https://github.com/tangency-labs/solidcraft';
    expect(attributionGaps([{ label: 'NOTICE', text: `${url} ${commit}` }], commit, url)).toEqual([]);
    expect(attributionGaps([{ label: 'NOTICE', text: url }], commit, url).join(' ')).toContain('NOTICE');
    expect(attributionGaps([], 'not-a-sha', url).join(' ')).toContain('40-character');
  });
});

describe('solidcraft vendored manifest', () => {
  it('aligns the manifest with the vendored oracle and keeps pending rows out of the executed set', async () => {
    const loaded = await loadLedger();
    const pr = selectCases(loaded.cases, 'pr');
    const all = selectCases(loaded.cases, 'all');
    expect(pr.length).toBeGreaterThan(0);
    expect(all.length).toBeGreaterThanOrEqual(pr.length);
    expect(pr.every((item) => item.status !== 'pending' && item.ci === 'pr' && item.source?.endsWith('.kcad.ts'))).toBe(true);
    expect(all.every((item) => item.status !== 'pending' && item.source?.endsWith('.kcad.ts'))).toBe(true);
    expect(loaded.cases.filter((item) => item.status === 'pending').every((item) => item.source === undefined)).toBe(true);
    expect(loaded.source.license).toBe('Apache-2.0');
    expect(loaded.source.url).toContain('github.com/tangency-labs/solidcraft');
  });
});
