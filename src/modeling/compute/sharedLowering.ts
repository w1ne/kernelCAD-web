// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Which records the recompute engine may ALIAS (reuse an earlier record's
// lowered shape) instead of lowering. Spec §2 (kernelCAD-private
// docs/specs/2026-10-06-assembly-instancing-scale-design.md).
//
// For every assembly part whose geometry key was already seen on an earlier
// part ("follower"), its whole upstream subgraph may be aliased when that
// subgraph is EXCLUSIVELY the follower's: no record in it feeds anything
// outside it. Then nothing ever consumes the aliased shapes during lowering
// except other aliased records, and the follower part ends up holding the
// leader's local-frame shape. Excluded: parts with topology-origin
// connectors (their origin is resolved through face lineage, whose feature
// ids would be the leader's).
//
// Keys are memoised per records array: a pose-only update (slider drag on a
// mate pose or a part's `at:`) re-runs the engine on the same array, and
// recomputing every key there would cost tens of ms at plant scale. Records
// are append-only except for `appendTransform` (in place), so the memo is
// keyed on (length, total transform count, param table, key param values).

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId } from '../../shared/intent/types';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { collectParamRefs } from '../../shared/runtime/resolveParams';
import { getRecordIndex } from '../../shared/intent/recordIndex';
import { computeGeometryKeys, isGeometrySharingEnabled } from './geometryIdentity';

export interface SharingState {
  readonly keys: ReadonlyMap<FeatureId, string>;
  readonly aliasable: ReadonlySet<FeatureId>;
  /** First successfully lowered record per key (filled by the engine). */
  readonly firstByKey: Map<string, FeatureId>;
}

interface KeyMemo {
  readonly length: number;
  readonly transformCount: number;
  readonly paramTable: ParamTable | undefined;
  readonly sharingEnabled: boolean;
  readonly keys: ReadonlyMap<FeatureId, string>;
  readonly aliasable: ReadonlySet<FeatureId>;
  readonly partIds: readonly FeatureId[];
  /** Params the keys depend on, and their values when the keys were made. */
  readonly paramNames: readonly string[];
  readonly paramValues: string;
}

const memoByRecords = new WeakMap<readonly FeatureRecord[], KeyMemo>();
let keyComputes = 0;

/** Test-only: number of full key computations done by `prepareSharing`. */
export function __geometryKeyComputesForTests(): number {
  return keyComputes;
}

/**
 * Per-run sharing state; undefined for scripts without assembly parts.
 * `seeded` (the engine's seed-shape cache) lets a run whose parts are all
 * cached reuse the previous keys: those parts keep the shapes the keys
 * described, and nothing is lowered that could be aliased.
 */
export function prepareSharing(
  records: readonly FeatureRecord[],
  paramTable: ParamTable | undefined,
  seeded?: ReadonlyMap<FeatureId, unknown>,
): SharingState | undefined {
  const memo = memoByRecords.get(records);
  const sameRun = memo !== undefined && memo.length === records.length && memo.paramTable === paramTable
    && memo.sharingEnabled === isGeometrySharingEnabled() && memo.transformCount === transformCountOf(records);
  if (sameRun && allSeeded(memo.partIds, seeded)) {
    return memo.partIds.length === 0 ? undefined : { keys: memo.keys, aliasable: new Set(), firstByKey: new Map() };
  }
  const fresh = sameRun && paramValuesOf(memo.paramNames, paramTable) === memo.paramValues
    ? memo
    : computeMemo(records, paramTable);
  if (fresh.partIds.length === 0) return undefined;
  return { keys: fresh.keys, aliasable: fresh.aliasable, firstByKey: new Map() };
}

function allSeeded(partIds: readonly FeatureId[], seeded: ReadonlyMap<FeatureId, unknown> | undefined): boolean {
  if (seeded === undefined || seeded.size === 0) return false;
  return partIds.every((id) => seeded.has(id));
}

function transformCountOf(records: readonly FeatureRecord[]): number {
  let n = 0;
  for (const r of records) n += r.transforms.length;
  return n;
}

function computeMemo(records: readonly FeatureRecord[], paramTable: ParamTable | undefined): KeyMemo {
  const partIds = records.filter((r) => r.kind === 'assemblyPart').map((r) => r.id);
  const sharingEnabled = isGeometrySharingEnabled();
  let keys: ReadonlyMap<FeatureId, string> = new Map();
  let aliasable: ReadonlySet<FeatureId> = new Set();
  let paramNames: string[] = [];
  if (partIds.length > 0) {
    keyComputes += 1;
    keys = computeGeometryKeys(records, paramTable);
    aliasable = sharingEnabled ? planSharedLowering(records, keys) : new Set();
    paramNames = keyParamNames(records, keys);
  }
  const memo: KeyMemo = {
    length: records.length,
    transformCount: transformCountOf(records),
    paramTable,
    sharingEnabled,
    keys,
    aliasable,
    partIds,
    paramNames,
    paramValues: paramValuesOf(paramNames, paramTable),
  };
  memoByRecords.set(records, memo);
  return memo;
}

/** Params that can change a key. An assemblyPart's key ignores its own
 *  params and metadata (`at:`), so its refs are placement-only. */
function keyParamNames(records: readonly FeatureRecord[], keys: ReadonlyMap<FeatureId, string>): string[] {
  const names = new Set<string>();
  for (const r of records) {
    if (r.kind === 'assemblyPart' || !keys.has(r.id)) continue;
    for (const n of collectParamRefs([r.params, r.metadata, r.transforms])) names.add(n);
  }
  return [...names].sort();
}

function paramValuesOf(names: readonly string[], paramTable: ParamTable | undefined): string {
  if (paramTable === undefined) return '';
  return JSON.stringify(names.map((n) => (paramTable.has(n) ? paramTable.get(n).value : null)));
}

export function planSharedLowering(
  records: readonly FeatureRecord[],
  keys: ReadonlyMap<FeatureId, string>,
): Set<FeatureId> {
  const byId = getRecordIndex(records);
  const consumers = consumersOf(records);
  const topologyParts = partsWithTopologyConnectors(records);
  const seenKeys = new Set<string>();
  const aliasable = new Set<FeatureId>();
  for (const r of records) {
    if (r.kind !== 'assemblyPart') continue;
    const key = keys.get(r.id);
    if (key === undefined || topologyParts.has(r.id)) continue;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      continue;
    }
    const subgraph = upstreamOf(r, byId);
    if (!isExclusive(subgraph, r.id, consumers)) continue;
    for (const id of subgraph) aliasable.add(id);
    aliasable.add(r.id);
  }
  return aliasable;
}

function upstreamIds(r: FeatureRecord): FeatureId[] {
  const out: FeatureId[] = [];
  for (const ref of Object.values(r.inputs)) {
    if (ref.kind === 'feature') out.push(ref.id);
    else if (ref.kind !== 'surface') out.push(ref.featureId);
  }
  return out;
}

function consumersOf(records: readonly FeatureRecord[]): Map<FeatureId, FeatureId[]> {
  const out = new Map<FeatureId, FeatureId[]>();
  for (const r of records) {
    for (const up of upstreamIds(r)) {
      const list = out.get(up);
      if (list === undefined) out.set(up, [r.id]);
      else list.push(r.id);
    }
  }
  return out;
}

function upstreamOf(part: FeatureRecord, byId: ReadonlyMap<FeatureId, FeatureRecord>): Set<FeatureId> {
  const seen = new Set<FeatureId>();
  const stack = upstreamIds(part);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const rec = byId.get(id);
    if (rec !== undefined) stack.push(...upstreamIds(rec));
  }
  return seen;
}

function isExclusive(
  subgraph: ReadonlySet<FeatureId>,
  partId: FeatureId,
  consumers: ReadonlyMap<FeatureId, FeatureId[]>,
): boolean {
  for (const id of subgraph) {
    for (const c of consumers.get(id) ?? []) {
      if (c !== partId && !subgraph.has(c)) return false;
    }
  }
  return true;
}

type ConnectorsByPart = Record<FeatureId, ReadonlyArray<{ origin?: { kind?: string } }>>;

/** Part ids that declare a topology-origin mate connector on any scene record. */
function partsWithTopologyConnectors(records: readonly FeatureRecord[]): Set<FeatureId> {
  const out = new Set<FeatureId>();
  for (const r of records) {
    if (r.kind !== 'solvedAssembly' && r.kind !== 'assemblyModel') continue;
    const byPart = (r.metadata as { connectorsByPartId?: ConnectorsByPart } | undefined)?.connectorsByPartId ?? {};
    for (const [partId, connectors] of Object.entries(byPart)) {
      if (connectors.some((c) => c.origin?.kind === 'topology')) out.add(partId);
    }
  }
  return out;
}
