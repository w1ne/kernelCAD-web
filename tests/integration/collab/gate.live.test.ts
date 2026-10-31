// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Real OCCT gate check against examples/collab/bracket-and-motor-plate.kcad.ts.
// Moving one bracket hole 2 mm breaks the shared hole-pattern requirement; a
// cosmetic bracket fillet change does not.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildModel } from '../../../src/modeling/buildModel';
import { evaluateRequirementsOnModel } from '../../../src/modeling/requirements/evaluate';
import { captureFeatureGraph } from '../../../src/collab/featureGraph';
import { liftChangeSet, type ChangeSetMeta } from '../../../src/collab/changeSet';
import { footprint } from '../../../src/collab/footprint';
import { gateCandidate } from '../../../src/collab/gate';
import type { EvaluatedRevision } from '../../../src/collab/types';

const file = resolve('examples/collab/bracket-and-motor-plate.kcad.ts');
const source = readFileSync(file, 'utf8');
const scriptDir = dirname(file);
const meta: ChangeSetMeta = { baseRevision: 1, agentId: 'live-agent', idempotencyKey: 'live' };

async function evaluateRevision(candidate: string): Promise<EvaluatedRevision> {
  const model = await buildModel({ code: candidate, fileName: file, scriptDir });
  const ledger = evaluateRequirementsOnModel(model);
  const features = new Map<string, 'ok' | 'error'>();
  for (const record of model.records) {
    features.set(record.id, model.health.get(record.id) === 'error' ? 'error' : 'ok');
  }
  return { revision: 1, features, requirements: ledger.entries, selections: model.selections };
}

async function candidateFootprint(candidate: string) {
  const base = await captureFeatureGraph(source, { fileName: file });
  const edited = await captureFeatureGraph(candidate, { fileName: file });
  return footprint(liftChangeSet(base, edited, meta), base);
}

describe('collab gate (live OCCT)', () => {
  it('rejects a 2 mm bracket-hole move with hole-pattern measured vs limit', async () => {
    const candidate = source.replace("param('bracketHoleX', 12", "param('bracketHoleX', 14");
    const head = await evaluateRevision(source);
    const verdict = await gateCandidate(
      { head, candidateSource: candidate, footprint: await candidateFootprint(candidate) },
      { evaluate: async (code) => evaluateRevision(code) },
    );
    expect(verdict.status).toBe('reject');
    if (verdict.status !== 'reject') return;
    const reason = verdict.reasons.find((r) => r.code === 'collab.gate.requirement-failed');
    expect(reason).toMatchObject({ name: 'hole-pattern' });
    if (reason?.code === 'collab.gate.requirement-failed') {
      expect(reason.measured).toBeGreaterThan(1.9);
      expect(reason.limit).toBe(0.5);
    }
  });

  it('passes a bracket fillet change', async () => {
    const candidate = source.replace("param('bracketFillet', 1.0", "param('bracketFillet', 1.2");
    const head = await evaluateRevision(source);
    const verdict = await gateCandidate(
      { head, candidateSource: candidate, footprint: await candidateFootprint(candidate) },
      { evaluate: async (code) => evaluateRevision(code) },
    );
    expect(verdict.status).toBe('pass');
  });
});
