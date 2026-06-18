// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Incremental code-edit rebuild — Slice 1 (append-only prefix reuse).
//
// See docs/specs/2026-06-14-incremental-code-rebuild-design.md (kernelCAD-private).
//
// On a CODE edit, `buildModel` re-runs capture + lowers EVERY record from
// scratch. When an agent appends a feature to the end of the script, the
// unchanged prefix is re-lowered needlessly. This module computes — provably
// and conservatively — how long a prefix of the new record list is identical
// to the previous build, so `rebuildModelIncremental` can seed the engine with
// the cached prefix shapes and lower only the appended tail.
//
// Safety bias: every ambiguity resolves toward "not reusable". A false
// negative only costs a full rebuild (the existing, correct behaviour); a
// false positive would render a STALE model, which is unacceptable. The
// structural hash therefore OVER-includes fields rather than risk excluding
// one that affects geometry.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { resolveParams } from '../../shared/runtime/resolveParams';

/**
 * Deterministic structural hash of a single record's lowering-relevant state,
 * resolved against the supplied param table.
 *
 * The record's `params`/`metadata` may carry symbolic `paramRef`s; the engine
 * pre-resolves these against the param table before lowering
 * (`resolveParams(r, table)` in `recomputeEngine.run`). We hash the SAME
 * resolved form so two records that lower to identical geometry hash equal even
 * when one carries a paramRef whose current value matches the other's literal.
 *
 * Returns a stable JSON string. We compare strings, never parse them.
 */
export function structuralHashRecord(
  record: FeatureRecord,
  paramTable: ParamTable | undefined,
): string {
  const resolved = paramTable ? (resolveParams(record, paramTable) as FeatureRecord) : record;
  // Strip derived / non-geometric keys from metadata. `paramRefs` is a derived
  // dependency index populated at capture time, not a geometry input — two
  // structurally-identical records always derive the same paramRefs, so
  // including it is harmless, but we drop it to keep the hash about geometry.
  const metadata = stripDerivedMetadata(resolved.metadata);
  // Build a canonical, key-sorted view of exactly the fields that affect
  // lowering. `id` is intentionally EXCLUDED — prefix matching checks id
  // equality separately; the hash answers "is the content the same", not "is
  // it the same record".
  const canonical = {
    kind: resolved.kind,
    inputs: resolved.inputs,
    params: resolved.params,
    transforms: resolved.transforms,
    suppressed: resolved.suppressed,
    metadata,
  };
  return stableStringify(canonical);
}

function stripDerivedMetadata(
  metadata: FeatureRecord['metadata'],
): Record<string, unknown> | undefined {
  if (metadata === undefined) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(metadata)) {
    if (key === 'paramRefs') continue;
    out[key] = (metadata as Record<string, unknown>)[key];
  }
  return out;
}

/**
 * Deterministic JSON stringify with sorted object keys, so two
 * structurally-equal blobs that differ only in key insertion order hash equal.
 * Arrays preserve order (order is semantic for transforms / control nets).
 *
 * Non-JSON values (functions, symbols, circular refs) should never appear in a
 * FeatureRecord's lowering-relevant fields — records are plain serializable
 * intent. If one ever does, `JSON.stringify` of the cyclic value would throw;
 * callers run this inside a try/catch and fall back to a full rebuild, so a
 * surprise non-serializable field degrades safely rather than crashing.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortDeep);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortDeep(obj[key]);
  }
  return out;
}

/** Per-record health from a prior build — only `'healthy'` records are
 *  reusable (a `'warning'`/`'error'` prefix record may have produced no shape
 *  or a degraded one we must not silently reuse). */
export type RecordHealth = 'healthy' | 'warning' | 'error';

export interface PrefixReuseInput {
  prevRecords: readonly FeatureRecord[];
  nextRecords: readonly FeatureRecord[];
  /** Param table of the PREVIOUS build (used to resolve prev records' hashes). */
  prevParamTable: ParamTable | undefined;
  /** Param table of the NEW build (used to resolve next records' hashes). */
  nextParamTable: ParamTable | undefined;
  /** Whether the previous build has a cached shape for a given record id. */
  hasCachedShape: (id: string) => boolean;
  /** Previous build's per-record health, keyed by record id. */
  prevHealth: ReadonlyMap<string, RecordHealth>;
}

export interface PrefixReuseDecision {
  /**
   * `true` when the ENTIRE previous record list is a verified, healthy, cached
   * prefix of the new record list AND the new list only appends (length grew or
   * stayed equal with the whole prev list matched). When `true`, the caller may
   * seed the engine with the previous cached shapes for `reusableIds` and lower
   * only the appended tail.
   *
   * Slice 1 reuses ONLY the full-prefix / pure-append case. A partial match
   * (edit in the middle) yields `reusable: false` → full rebuild.
   */
  reusable: boolean;
  /** Number of leading records that matched (id + structural hash + healthy +
   *  cached). For diagnostics / tests; reuse only fires when this equals the
   *  previous record count AND the predicate below holds. */
  matchedPrefixLength: number;
  /** Ids of the records whose cached shapes the caller should seed. Empty when
   *  `reusable` is false. */
  reusableIds: readonly string[];
}

/**
 * Compute the append-only prefix-reuse decision. Pure + synchronous: it does
 * no lowering, only compares records. The caller (`rebuildModelIncremental`)
 * owns the actual seeding + fallback.
 */
export function computePrefixReuse(input: PrefixReuseInput): PrefixReuseDecision {
  const { prevRecords, nextRecords, prevParamTable, nextParamTable, hasCachedShape, prevHealth } =
    input;

  const noReuse: PrefixReuseDecision = {
    reusable: false,
    matchedPrefixLength: 0,
    reusableIds: [],
  };

  // Nothing to reuse if there was no previous build.
  if (prevRecords.length === 0) return noReuse;

  // Pure-append requirement: the new list must be at least as long as the old.
  // Any shrink (delete) means a non-append edit ⇒ full rebuild.
  if (nextRecords.length < prevRecords.length) return noReuse;

  const limit = prevRecords.length; // we only ever try to match the prev prefix
  let matched = 0;
  const reusableIds: string[] = [];

  for (let i = 0; i < limit; i++) {
    const prev = prevRecords[i];
    const next = nextRecords[i];

    // Id stability: per-kind counters guarantee an unchanged prefix mints
    // identical ids. A mismatch means the capture order diverged (insert /
    // delete / reorder upstream) ⇒ stop.
    if (prev.id !== next.id) break;

    // The previous record must have produced a healthy cached shape; otherwise
    // there is nothing trustworthy to seed.
    if (prevHealth.get(prev.id) !== 'healthy') break;
    if (!hasCachedShape(prev.id)) break;

    // Content must be identical (resolved against each build's param table).
    if (
      structuralHashRecord(prev, prevParamTable) !==
      structuralHashRecord(next, nextParamTable)
    ) {
      break;
    }

    matched += 1;
    reusableIds.push(prev.id);
  }

  // Slice 1 reuses ONLY when the WHOLE previous record list matched as a
  // healthy cached prefix of the new list. A partial match (edit somewhere in
  // the middle) falls back to a full rebuild — partial-prefix reuse is a later
  // slice (see spec §5/§6).
  const reusable = matched === prevRecords.length && matched > 0;

  return reusable
    ? { reusable: true, matchedPrefixLength: matched, reusableIds }
    : { ...noReuse, matchedPrefixLength: matched };
}
