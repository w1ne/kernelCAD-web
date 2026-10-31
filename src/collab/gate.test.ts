// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it, vi } from 'vitest';
import { gateCandidate } from './gate';
import type { EvaluatedRevision, Footprint } from './types';
import type { RequirementLedgerEntry } from '../shared/intent/requirementRecord';
import type { SelectionRecord } from '../shared/intent/selectionRecord';

function revision(
  features: Record<string, 'ok' | 'error'>,
  requirements: RequirementLedgerEntry[] = [],
  selections: SelectionRecord[] = [],
): EvaluatedRevision {
  return { revision: 1, features: new Map(Object.entries(features)), requirements, selections };
}

function foot(writes: string[] = [], downstream: string[] = []): Footprint {
  return { writes: new Set(writes), reads: new Set(), downstream: new Set(downstream), requirements: new Set() };
}

function requirement(name: string, status: 'pass' | 'fail', extras: Partial<RequirementLedgerEntry> = {}): RequirementLedgerEntry {
  return { name, source: 'script', status, measured: 1, limit: 2, margin: 1, selections: [], ...extras };
}

function selection(consumer: string, producer: string): SelectionRecord {
  return {
    consumerFeatureId: consumer,
    selectorText: 'top',
    syntax: 'lineage',
    partDiagonal: 100,
    fingerprints: [{ entityKind: 'face', geomType: 'PLANE', producer, size: 100, centroid: [0, 0, 0] }],
  };
}

describe('gateCandidate', () => {
  it('rejects a feature that was healthy in both parents and fails in the candidate', async () => {
    const result = await gateCandidate(
      {
        head: revision({ box_1: 'ok', fillet_1: 'ok' }),
        yoursParent: revision({ box_1: 'ok', fillet_1: 'ok' }),
        candidateSource: 'x',
        footprint: foot(['fillet_1']),
      },
      { evaluate: async () => revision({ box_1: 'ok', fillet_1: 'error' }) },
    );
    expect(result).toMatchObject({ status: 'reject', reasons: [{ code: 'collab.gate.feature-failed', id: 'fillet_1' }] });
  });

  it('rejects a requirement that passed at head and now fails, with its closure', async () => {
    const failing = requirement('hole-pattern', 'fail', {
      measured: 2,
      limit: 0.2,
      selections: [selection('require_1', 'hole_1'), selection('require_1', 'hole_2')],
    });
    const result = await gateCandidate(
      {
        head: revision({ hole_1: 'ok', hole_2: 'ok' }, [requirement('hole-pattern', 'pass')]),
        candidateSource: 'x',
        footprint: foot(['hole_1'], ['fillet_1']),
      },
      { evaluate: async () => revision({ hole_1: 'ok', hole_2: 'ok' }, [failing]) },
    );
    expect(result).toMatchObject({
      status: 'reject',
      reasons: [{
        code: 'collab.gate.requirement-failed',
        name: 'hole-pattern',
        measured: 2,
        limit: 0.2,
        closure: ['hole_1'],
      }],
    });
  });

  it('passes and reports a requirement already failing at head as pre-existing', async () => {
    const result = await gateCandidate(
      {
        head: revision({ box_1: 'ok' }, [requirement('mass-band', 'fail')]),
        candidateSource: 'x',
        footprint: foot(['box_1']),
      },
      { evaluate: async () => revision({ box_1: 'ok' }, [requirement('mass-band', 'fail')]) },
    );
    expect(result).toMatchObject({ status: 'pass', preexisting: ['mass-band'] });
  });

  it('rejects a binding change outside the write footprint and notes one inside', async () => {
    const before = selection('fillet_1', 'box_1');
    const outside = await gateCandidate(
      {
        head: revision({ fillet_1: 'ok', box_1: 'ok' }, [], [before]),
        candidateSource: 'x',
        footprint: foot(['box_1']),
      },
      { evaluate: async () => revision({ fillet_1: 'ok', box_1: 'ok' }, [], [selection('fillet_1', 'box_2')]) },
    );
    expect(outside).toMatchObject({
      status: 'reject',
      reasons: [{ code: 'collab.gate.binding-changed' }],
    });

    const inside = await gateCandidate(
      {
        head: revision({ fillet_1: 'ok', box_1: 'ok' }, [], [before]),
        candidateSource: 'x',
        footprint: foot(['fillet_1']),
      },
      { evaluate: async () => revision({ fillet_1: 'ok', box_1: 'ok' }, [], [selection('fillet_1', 'box_2')]) },
    );
    expect(inside.status).toBe('pass');
    if (inside.status === 'pass') expect(inside.notes).toHaveLength(1);
  });

  it('rejects rather than passes when evaluation throws, and evaluates once', async () => {
    const evaluate = vi.fn(async () => {
      throw new Error('kernel crashed');
    });
    const result = await gateCandidate(
      { head: revision({ box_1: 'ok' }), candidateSource: 'x', footprint: foot(['box_1']) },
      { evaluate },
    );
    expect(result).toMatchObject({ status: 'reject', reasons: [{ code: 'collab.gate.evaluation-failed' }] });
    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it('evaluates only the candidate', async () => {
    const evaluate = vi.fn(async () => revision({ box_1: 'ok' }));
    await gateCandidate(
      { head: revision({ box_1: 'ok' }), candidateSource: 'merged source', footprint: foot(['box_1']) },
      { evaluate },
    );
    expect(evaluate).toHaveBeenCalledWith('merged source', expect.anything());
    expect(evaluate).toHaveBeenCalledTimes(1);
  });
});
