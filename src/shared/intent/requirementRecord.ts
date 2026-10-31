// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One requirements ledger (S2). A requirement is a named, kernel-measured
// predicate over selections. Scripts declare requirements with `require()`;
// `dfmSpec`, `feaStudy.minSafetyFactor`, mechanical intent and call-time
// external requirements all report into the same ledger.

import type { FaceQuery, EdgeQuery } from './queryTypes';
import type { SelectionRecord } from './selectionRecord';
import type { Vec3 } from './types';

export type RequirementStatus = 'pass' | 'fail' | 'not-evaluated';

/** Where an entry came from. `external` requirements are supplied per call and
 *  are never persisted into the project. */
export type RequirementSource = 'script' | 'external' | 'dfm' | 'fea' | 'mechanical' | 'assembly';

export type RequirementMetric =
  | 'clearance'
  | 'distance'
  | 'mass'
  | 'volume'
  | 'bbox'
  | 'centerOfMass'
  | 'count'
  | 'innerLoops'
  | 'angle'
  | 'concentric'
  | 'coplanar';

export type RequirementOperator = 'gte' | 'lte' | 'eq' | 'between' | 'within';

/** An axis-aligned band, one entry per axis. */
export interface RequirementBands {
  x?: readonly [number, number];
  y?: readonly [number, number];
  z?: readonly [number, number];
}

export type RequirementLimit =
  | number
  | readonly [number, number]
  | RequirementBands
  | readonly [Vec3, Vec3]
  | null;

/** How a requirement names the geometry it reads. `body` is a whole feature;
 *  `faces` / `edges` are resolved with the same query DSL the rest of the API
 *  uses. `part` names an assembly part for external requirements. */
export interface RequirementOperand {
  kind: 'body' | 'faces' | 'edges' | 'part';
  /** Feature id / feature name / assembly part name. */
  ref: string;
  query?: FaceQuery | EdgeQuery;
  /** Optional captured entity refs (@kc[...]) for external requirements. */
  entityRefs?: string[];
  /** Compact geometric snapshots captured at authoring time. Used to resolve
   *  descriptors that do not carry their owning feature (external fixtures,
   *  hand-built lists). */
  snapshots?: RequirementEntitySnapshot[];
}

export interface RequirementEntitySnapshot {
  entityKind: 'face' | 'edge';
  centroid: Vec3;
  direction?: Vec3;
  size?: number;
}

export interface RequirementPredicateSpec {
  metric: RequirementMetric;
  a?: RequirementOperand;
  b?: RequirementOperand;
  op?: RequirementOperator;
  limit?: RequirementLimit;
  /** Millimetres (coplanar, concentric) or degrees (angle). */
  tolerance?: number;
  /** kg/m^3 for `mass`; defaults to water, like inspect({ of: 'mass' }). */
  density?: number;
}

/** The value measured by a requirement. Scalars are numbers; vector metrics
 *  report arrays or per-axis objects; `null` means it could not be measured. */
export type RequirementMeasured =
  | number
  | readonly number[]
  | Readonly<Record<string, number>>
  | null;

/** A script-authored requirement, stored on its virtual record. */
export interface RequirementRecordMetadata {
  virtual: true;
  name: string;
  predicate: RequirementPredicateSpec;
}

/** A call-time requirement. Selectors are resolved against the built model;
 *  `source` is always reported as `external`. */
export interface ExternalRequirement {
  name: string;
  predicate: RequirementPredicateSpec;
}

export interface RequirementLedgerEntry {
  name: string;
  source: RequirementSource;
  status: RequirementStatus;
  measured: RequirementMeasured;
  limit: RequirementLimit;
  /** Signed distance from the limit in the metric's unit. For `gte` a
   *  positive margin means the measured value is above the minimum; for
   *  `lte` a positive margin means it is below the maximum. For an equality
   *  requirement the margin is measured - limit. For each-axis bands it is
   *  the smallest per-axis margin. Null when not evaluated. */
  margin: number | null;
  /** Selections the requirement bound to, with their S1 fingerprints, so a
   *  viewer can highlight the exact entities named by a failure. */
  selections: SelectionRecord[];
  /** One-line human diagnosis, naming the measured value, limit and the
   *  selections involved. Present for failures and not-evaluated entries. */
  message?: string;
  /** The declaring feature (`require` record) for script requirements. */
  featureId?: string;
  /** The predicate as evaluated, for reconstruction and diffs. */
  predicate?: RequirementPredicateSpec;
}

export interface RequirementsLedgerSummary {
  pass: number;
  fail: number;
  notEvaluated: number;
}

export interface RequirementsLedger {
  /** True only when every entry passed. An empty ledger is a pass. A
   *  `not-evaluated` entry never counts as green. */
  ok: boolean;
  entries: RequirementLedgerEntry[];
  summary: RequirementsLedgerSummary;
}

export function emptyLedger(): RequirementsLedger {
  return { ok: true, entries: [], summary: { pass: 0, fail: 0, notEvaluated: 0 } };
}

/** Build the summary and the all-pass verdict from entries. */
export function ledgerFromEntries(entries: readonly RequirementLedgerEntry[]): RequirementsLedger {
  const summary = { pass: 0, fail: 0, notEvaluated: 0 };
  for (const entry of entries) {
    if (entry.status === 'pass') summary.pass += 1;
    else if (entry.status === 'fail') summary.fail += 1;
    else summary.notEvaluated += 1;
  }
  return { ok: entries.every(e => e.status === 'pass'), entries: [...entries], summary };
}
