// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// S2 ledger diff. Pure: compares two requirements ledgers and names what an
// edit changed — which requirements appeared or vanished, which flipped
// status, and which margins shrank. It does not measure anything; the two
// ledgers it compares are produced by the same evaluator.
//
// The ledger is matched by (source, name, featureId) and, within a key, by
// occurrence, so a script that declares two requirements with the same name
// still gets a deterministic pairing.

import type {
  RequirementLedgerEntry,
  RequirementLimit,
  RequirementMeasured,
  RequirementSource,
  RequirementStatus,
  RequirementsLedger,
  RequirementsLedgerSummary,
} from './requirementRecord';

/** The stable part of a ledger entry: what changed, without repeating the
 *  selections (the S1 binding diff reports those separately). */
export interface RequirementSnapshot {
  name: string;
  source: RequirementSource;
  featureId?: string;
  status: RequirementStatus;
  measured: RequirementMeasured;
  limit: RequirementLimit;
  margin: number | null;
  message?: string;
}

export interface RequirementMarginDiff {
  before: number | null;
  after: number | null;
  /** after - before, null when either side has no numeric margin. */
  delta: number | null;
  /** `shrink` means the margin moved towards or through the limit. */
  direction: 'shrink' | 'grow' | 'same' | 'unknown';
}

export interface RequirementLedgerDiffEntry {
  name: string;
  source: RequirementSource;
  featureId?: string;
  /** A matching entry on the baseline side, absent when the requirement is new. */
  before?: RequirementSnapshot;
  /** A matching entry on the revised side, absent when it disappeared. */
  after?: RequirementSnapshot;
  /** Same requirement, different status (pass <-> fail or not-evaluated). */
  flipped: boolean;
  statusChanged: boolean;
  margin: RequirementMarginDiff;
  changed: boolean;
}

export interface RequirementLedgerDiffSummary {
  before: RequirementsLedgerSummary;
  after: RequirementsLedgerSummary;
  flipped: number;
  marginsShrunk: number;
  added: number;
  removed: number;
}

export interface RequirementLedgerDiff {
  /** True only when every entry in the revised ledger passed. */
  ok: boolean;
  /** True when at least one entry appeared, vanished, flipped or moved. */
  changed: boolean;
  entries: RequirementLedgerDiffEntry[];
  /** Every entry whose status changed, pass->fail and fail->pass alike. */
  flipped: RequirementLedgerDiffEntry[];
  /** Every matched entry whose numeric margin got smaller. */
  marginsShrunk: RequirementLedgerDiffEntry[];
  added: RequirementLedgerDiffEntry[];
  removed: RequirementLedgerDiffEntry[];
  summary: RequirementLedgerDiffSummary;
}

const MARGIN_EPS = 1e-9;

function snapshot(entry: RequirementLedgerEntry): RequirementSnapshot {
  return {
    name: entry.name,
    source: entry.source,
    ...(entry.featureId !== undefined ? { featureId: entry.featureId } : {}),
    status: entry.status,
    measured: entry.measured,
    limit: entry.limit,
    margin: entry.margin,
    ...(entry.message !== undefined ? { message: entry.message } : {}),
  };
}

function key(entry: RequirementLedgerEntry): string {
  return `${entry.source}\u0000${entry.name}\u0000${entry.featureId ?? ''}`;
}

function groups(
  entries: readonly RequirementLedgerEntry[],
): Map<string, RequirementLedgerEntry[]> {
  const out = new Map<string, RequirementLedgerEntry[]>();
  for (const entry of entries) {
    const k = key(entry);
    const list = out.get(k) ?? [];
    list.push(entry);
    out.set(k, list);
  }
  return out;
}

function marginDiff(before: number | null, after: number | null): RequirementMarginDiff {
  if (before === null || after === null) {
    return { before, after, delta: null, direction: 'unknown' };
  }
  const delta = after - before;
  if (Math.abs(delta) <= MARGIN_EPS) return { before, after, delta, direction: 'same' };
  return { before, after, delta, direction: delta < 0 ? 'shrink' : 'grow' };
}

function matchedEntry(
  name: string,
  source: RequirementSource,
  featureId: string | undefined,
  before: RequirementLedgerEntry | undefined,
  after: RequirementLedgerEntry | undefined,
): RequirementLedgerDiffEntry {
  const margin = marginDiff(before?.margin ?? null, after?.margin ?? null);
  const flipped = before !== undefined && after !== undefined && before.status !== after.status;
  const statusChanged = flipped;
  const changed = before === undefined
    || after === undefined
    || flipped
    || margin.direction === 'shrink'
    || margin.direction === 'grow';
  return {
    name,
    source,
    ...(featureId !== undefined ? { featureId } : {}),
    ...(before !== undefined ? { before: snapshot(before) } : {}),
    ...(after !== undefined ? { after: snapshot(after) } : {}),
    flipped,
    statusChanged,
    margin,
    changed,
  };
}

/** Compare two S2 ledgers. Pure and deterministic: entries pair by
 *  (source, name, featureId), then by occurrence order within that key. */
export function diffRequirementLedgers(
  before: RequirementsLedger,
  after: RequirementsLedger,
): RequirementLedgerDiff {
  const beforeGroups = groups(before.entries);
  const afterGroups = groups(after.entries);
  const keys = new Set<string>([...beforeGroups.keys(), ...afterGroups.keys()]);
  const entries: RequirementLedgerDiffEntry[] = [];

  for (const k of keys) {
    const prior = beforeGroups.get(k) ?? [];
    const next = afterGroups.get(k) ?? [];
    const count = Math.max(prior.length, next.length);
    for (let i = 0; i < count; i++) {
      const b = prior[i];
      const a = next[i];
      const anchor = a ?? b;
      if (anchor === undefined) continue;
      entries.push(matchedEntry(anchor.name, anchor.source, anchor.featureId, b, a));
    }
  }

  const flipped = entries.filter((e) => e.flipped);
  const marginsShrunk = entries.filter((e) => e.margin.direction === 'shrink');
  const added = entries.filter((e) => e.before === undefined);
  const removed = entries.filter((e) => e.after === undefined);
  const changed = entries.some((e) => e.changed);

  return {
    ok: after.ok,
    changed,
    entries,
    flipped,
    marginsShrunk,
    added,
    removed,
    summary: {
      before: before.summary,
      after: after.summary,
      flipped: flipped.length,
      marginsShrunk: marginsShrunk.length,
      added: added.length,
      removed: removed.length,
    },
  };
}
