// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { dfmRequirementEntries } from '../../../src/modeling/requirements/dfmLedger';
import { feaRequirementEntries } from '../../../src/modeling/requirements/feaLedger';
import { mechanicalRequirementEntries } from '../../../src/modeling/requirements/mechanicalLedger';
import type { DfmCheckReport } from '../../../src/modeling/runtime/dfm/runDfmChecks';
import type { DfmSpecMetadata } from '../../../src/shared/intent/dfmSpecRecord';
import type { FeaGateReport } from '../../../src/modeling/runtime/fea/runFeaGate';
import type { FeaSummary } from '../../../src/kernel/fea/types';
import type { MechanicalIntentDiagnostic } from '../../../src/modeling/mates/mechanicalIntent';

const dfmSpec = (over: Partial<DfmSpecMetadata> = {}): DfmSpecMetadata => ({
  virtual: true,
  includeArticulatedMates: false,
  ignore: [],
  exclude: [],
  channels: [],
  ...over,
});

const dfmReport = (over: Partial<DfmCheckReport> = {}): DfmCheckReport => ({
  clearance: [],
  walls: [],
  voids: [],
  diagnostics: [],
  timings: {},
  ...over,
});

describe('DFM → ledger adapter', () => {
  it('reports a violated clearance with measured, limit and margin', () => {
    const entries = dfmRequirementEntries(
      dfmReport({ clearance: [{ a: 'bracket', b: 'housing', distanceMm: 0.6, status: 'violated', exact: true }] }),
      dfmSpec({ minClearance: 1 }),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'dfm.clearance.bracket~housing',
      source: 'dfm',
      status: 'fail',
      measured: 0.6,
      limit: 1,
      margin: expect.closeTo(-0.4),
    });
  });

  it('reports a passing pair and leaves ignored/mated pairs out', () => {
    const entries = dfmRequirementEntries(
      dfmReport({
        clearance: [
          { a: 'a', b: 'b', distanceMm: 2, status: 'ok', exact: true },
          { a: 'b', b: 'c', distanceMm: Number.NaN, status: 'ignored', exact: false },
        ],
      }),
      dfmSpec({ minClearance: 1 }),
    );
    expect(entries.map(e => [e.name, e.status])).toEqual([['dfm.clearance.a~b', 'pass']]);
  });

  it('reports a thin wall and an unmeasurable wall', () => {
    const entries = dfmRequirementEntries(
      dfmReport({
        walls: [
          { part: 'plate', result: { violations: [], truncated: false, sampleCount: 1, thinnestMm: 1.2 } },
          { part: 'bracket', result: { violations: [], truncated: false, sampleCount: 0, thinnestMm: Infinity } },
        ],
      }),
      dfmSpec({ minWall: 1.5 }),
    );
    expect(entries.find(e => e.name === 'dfm.minWall.plate')).toMatchObject({ status: 'fail', measured: 1.2, margin: expect.closeTo(-0.3) });
    expect(entries.find(e => e.name === 'dfm.minWall.bracket')).toMatchObject({ status: 'not-evaluated', measured: null });
  });
});

describe('FEA → ledger adapter', () => {
  const summary = (over: Partial<FeaSummary> = {}): FeaSummary => ({
    study: 'shelf',
    material: { name: 'mild-steel', E: 200000, nu: 0.3, yield: 250 },
    maxVonMisesMPa: 100,
    maxVonMisesAt: [0, 0, 0],
    maxDisplacementMm: 0.1,
    maxDisplacementAt: [0, 0, 0],
    minSafetyFactor: 2.5,
    minSafetyFactorRequired: 2,
    nodeCount: 1,
    elementCount: 1,
    meshSizeMm: 2,
    quality: {} as FeaSummary['quality'],
    trust: { meshTrusted: true, reasons: [] },
    hotSpots: [],
    ...over,
  });
  const report = (over: Partial<FeaGateReport> = {}): FeaGateReport => ({
    diagnostics: [],
    summaries: [],
    skipped: [],
    ...over,
  });

  it('reports a gated study with a numeric margin', () => {
    const entries = feaRequirementEntries(report({ summaries: [summary()] }));
    expect(entries[0]).toMatchObject({
      name: 'fea.shelf.minSafetyFactor',
      source: 'fea',
      status: 'pass',
      measured: 2.5,
      limit: 2,
      margin: expect.closeTo(0.5),
    });
  });

  it('keeps a skipped gate not-evaluated, never green', () => {
    const entries = feaRequirementEntries(report({ skipped: ['shelf'] }));
    expect(entries[0]).toMatchObject({ status: 'not-evaluated', measured: null, limit: null });
  });
});

describe('mechanical intent → ledger adapter', () => {
  it('creates one pass/fail entry per declared intent', () => {
    const failure = {
      code: 'assembly.mechanical.intent.mate-missing',
      severity: 'error',
      intentName: 'elbow',
      message: 'missing mate',
      hint: '',
      mateName: 'm',
    } as unknown as MechanicalIntentDiagnostic;
    const entries = mechanicalRequirementEntries([failure], ['elbow', 'wrist']);
    expect(entries.map(e => [e.name, e.status])).toEqual([
      ['mechanical.elbow', 'fail'],
      ['mechanical.wrist', 'pass'],
    ]);
  });
});
