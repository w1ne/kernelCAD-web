// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 5: tier-3 gate. Only the merged candidate is evaluated (exactly once).
// It passes only when no feature that was healthy in both parents fails, no
// selector outside the write set re-binds, and no requirement that was green at
// head fails. Requirements already failing at head are pre-existing, not the
// submitter's fault.

import { diffSelectionBindings } from '../kernel/naming/bindingDiff';
import type { RequirementLedgerEntry } from '../shared/intent/requirementRecord';
import type {
  EvaluatedRevision,
  FeatureId,
  Footprint,
  GateReason,
  GateVerdict,
} from './types';

export interface GateInput {
  head: EvaluatedRevision;
  /** The submitter's own evaluation, when available. A feature that failed
   *  there was already broken on this branch; the gate only blames a feature
   *  that was healthy in both parents. */
  yoursParent?: EvaluatedRevision;
  candidateSource: string;
  footprint: Footprint;
}

export interface GateDeps {
  evaluate(source: string, reuse: EvaluatedRevision): Promise<EvaluatedRevision>;
}

function numeric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function requirementInputs(entry: RequirementLedgerEntry): FeatureId[] {
  const ids = new Set<FeatureId>();
  for (const selection of entry.selections) {
    for (const fingerprint of selection.fingerprints) {
      if (fingerprint.producer !== undefined) ids.add(fingerprint.producer);
    }
  }
  return [...ids];
}

function failedAtHead(head: EvaluatedRevision, name: string): boolean {
  return head.requirements.some((entry) => entry.name === name && entry.status === 'fail');
}

export async function gateCandidate(input: GateInput, deps: GateDeps): Promise<GateVerdict> {
  const { head, yoursParent, candidateSource, footprint } = input;

  let candidate: EvaluatedRevision;
  try {
    candidate = await deps.evaluate(candidateSource, head);
  } catch (err) {
    return {
      status: 'reject',
      reasons: [{ code: 'collab.gate.evaluation-failed', diagnostics: [err instanceof Error ? err.message : err] }],
    };
  }

  const reasons: GateReason[] = [];

  for (const [id, status] of candidate.features) {
    if (status !== 'error') continue;
    if (head.features.get(id) !== 'ok') continue;
    if (yoursParent !== undefined && yoursParent.features.get(id) !== 'ok') continue;
    reasons.push({ code: 'collab.gate.feature-failed', id });
  }

  const notes: string[] = [];
  const bindingChanges = diffSelectionBindings(head.selections, candidate.selections).filter(
    (change) => change.verdict === 'changed',
  );
  for (const change of bindingChanges) {
    if (footprint.writes.has(change.consumerFeatureId) || footprint.downstream.has(change.consumerFeatureId)) {
      notes.push(`binding changed inside the write footprint: ${change.consumerFeatureId} ${change.selectorText}`);
      continue;
    }
    reasons.push({ code: 'collab.gate.binding-changed', change });
  }

  const preexisting: string[] = [];
  const closure = new Set<FeatureId>([...footprint.writes, ...footprint.downstream]);
  for (const entry of candidate.requirements) {
    if (entry.status !== 'fail') continue;
    if (failedAtHead(head, entry.name)) {
      preexisting.push(entry.name);
      continue;
    }
    const inputs = requirementInputs(entry).filter((id) => closure.has(id));
    reasons.push({
      code: 'collab.gate.requirement-failed',
      name: entry.name,
      ...(numeric(entry.measured) !== undefined ? { measured: numeric(entry.measured)! } : {}),
      ...(numeric(entry.limit) !== undefined ? { limit: numeric(entry.limit)! } : {}),
      closure: inputs.length > 0 ? inputs : [...footprint.writes],
    });
  }

  if (reasons.length > 0) return { status: 'reject', reasons, evaluated: candidate };
  return {
    status: 'pass',
    evaluated: candidate,
    preexisting,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
