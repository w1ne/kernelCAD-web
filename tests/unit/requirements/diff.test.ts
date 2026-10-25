// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  diffRequirementLedgers,
} from '../../../src/shared/intent/requirementDiff';
import {
  ledgerFromEntries,
  type RequirementLedgerEntry,
  type RequirementStatus,
} from '../../../src/shared/intent/requirementRecord';

function entry(
  name: string,
  status: RequirementStatus,
  margin: number | null,
  over: Partial<RequirementLedgerEntry> = {},
): RequirementLedgerEntry {
  return {
    name,
    source: 'script',
    status,
    measured: margin,
    limit: 0,
    margin,
    selections: [],
    ...over,
  };
}

describe('diffRequirementLedgers (S6)', () => {
  it('is unchanged when both ledgers are identical', () => {
    const ledger = ledgerFromEntries([entry('gap', 'pass', 2)]);
    const diff = diffRequirementLedgers(ledger, ledgerFromEntries([entry('gap', 'pass', 2)]));
    expect(diff.changed).toBe(false);
    expect(diff.flipped).toEqual([]);
    expect(diff.marginsShrunk).toEqual([]);
    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0]!.changed).toBe(false);
  });

  it('reports a pass -> fail flip with both statuses and the margin drop', () => {
    const diff = diffRequirementLedgers(
      ledgerFromEntries([entry('bracket-volume', 'pass', 30)]),
      ledgerFromEntries([entry('bracket-volume', 'fail', -20)]),
    );
    expect(diff.changed).toBe(true);
    expect(diff.ok).toBe(false);
    expect(diff.flipped).toHaveLength(1);
    expect(diff.flipped[0]).toMatchObject({
      name: 'bracket-volume',
      flipped: true,
      statusChanged: true,
      before: { status: 'pass', margin: 30 },
      after: { status: 'fail', margin: -20 },
      margin: { before: 30, after: -20, delta: -50, direction: 'shrink' },
    });
    expect(diff.summary).toMatchObject({ flipped: 1, marginsShrunk: 1, added: 0, removed: 0 });
  });

  it('reports a margin shrink that still passes', () => {
    const diff = diffRequirementLedgers(
      ledgerFromEntries([entry('width-band', 'pass', 1)]),
      ledgerFromEntries([entry('width-band', 'pass', 0.5)]),
    );
    expect(diff.flipped).toEqual([]);
    expect(diff.marginsShrunk).toHaveLength(1);
    expect(diff.marginsShrunk[0]!.margin).toEqual({
      before: 1, after: 0.5, delta: -0.5, direction: 'shrink',
    });
  });

  it('reports added and removed requirements, including duplicate names by occurrence', () => {
    const before = ledgerFromEntries([
      entry('gap', 'pass', 1),
      entry('gap', 'fail', -1),
      entry('old', 'pass', 1),
    ]);
    const after = ledgerFromEntries([
      entry('gap', 'pass', 0.5),
      entry('gap', 'fail', -2),
      entry('new', 'pass', 1),
    ]);
    const diff = diffRequirementLedgers(before, after);
    expect(diff.added.map((e) => e.name)).toEqual(['new']);
    expect(diff.removed.map((e) => e.name)).toEqual(['old']);
    expect(diff.marginsShrunk.map((e) => e.name)).toEqual(['gap', 'gap']);
    expect(diff.entries.filter((e) => e.name === 'gap')).toHaveLength(2);
  });

  it('reports an unknown margin when either side is not-evaluated', () => {
    const diff = diffRequirementLedgers(
      ledgerFromEntries([entry('clearance', 'pass', 1)]),
      ledgerFromEntries([entry('clearance', 'not-evaluated', null)]),
    );
    expect(diff.flipped[0]!.after?.status).toBe('not-evaluated');
    expect(diff.flipped[0]!.margin).toEqual({
      before: 1, after: null, delta: null, direction: 'unknown',
    });
  });
});
