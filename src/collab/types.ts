// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Part A of the multi-agent collaboration design: the source-derived feature
// graph, typed change-sets, structural merge results and the static/actual
// gate vocabulary. Nothing here touches the queue, identity or hosted
// orchestration (Part B).

import type { RequirementLedgerEntry, RequirementPredicateSpec } from '../shared/intent/requirementRecord';
import type { SelectionRecord } from '../shared/intent/selectionRecord';
import type { SelectionBindingChange } from '../kernel/naming/bindingDiff';

export type FeatureId = string;

/** Half-open character range in the original source file. */
export interface SourceSpan {
  start: number;
  end: number;
}

/** One captured feature, keyed by the capture's stable feature id. */
export interface FeatureNode {
  id: FeatureId;
  kind: string;
  /** Resolved named parameter values. Symbolic params report their current
   *  evaluated value; `paramRefs` records which project params feed them. */
  params: Record<string, unknown>;
  /** Named input slots to the feature ids they read. */
  refs: Record<string, FeatureId[]>;
  orderKey: number;
  /** Character range of the statement that authored the feature. */
  sourceSpan: SourceSpan;
  /** Character range of the call expression itself (inside sourceSpan). */
  callSpan?: SourceSpan;
  /** Project parameter names each named param depends on (empty for literals). */
  paramRefs?: Record<string, string[]>;
}

export interface RequirementNode {
  inputs: FeatureId[];
  predicate?: RequirementPredicateSpec;
  sourceSpan?: SourceSpan;
}

export interface UnownedSpan extends SourceSpan {
  /** The statement text. Used to three-way merge source no feature owns. */
  text?: string;
}

export interface FeatureGraph {
  /** Stable hash of everything except spans and unowned text. */
  revisionHash: string;
  features: Map<FeatureId, FeatureNode>;
  order: FeatureId[];
  /** Project-level params (`param(...)`) by name. */
  params: Record<string, unknown>;
  /** Declaration details, when available, for type/range validation. */
  paramDeclarations?: Record<string, { type: string; meta?: Record<string, unknown> }>;
  requirements: Record<string, RequirementNode>;
  /** Top-level source not owned by a feature or a param declaration. */
  unowned: UnownedSpan[];
}

export type ChangeOp =
  | { op: 'setParam'; target: FeatureId | '$project'; name: string; from: unknown; to: unknown }
  | { op: 'insertFeature'; id: FeatureId; after: FeatureId | null; node: FeatureNode }
  | { op: 'deleteFeature'; id: FeatureId }
  | { op: 'setRef'; id: FeatureId; slot: string; from: FeatureId[]; to: FeatureId[] }
  | { op: 'moveFeature'; id: FeatureId; after: FeatureId | null }
  | { op: 'editRequirement'; name: string; from: unknown; to: unknown }
  | { op: 'editUnowned'; span: SourceSpan };

export interface ChangeSet {
  baseRevision: number;
  agentId: string;
  idempotencyKey: string;
  ops: ChangeOp[];
  writeSet: FeatureId[];
}

export type CollabConflict =
  | { code: 'collab.conflict.param'; target: string; name: string; base: unknown; head: unknown; yours: unknown }
  | { code: 'collab.conflict.deleted-ref'; id: FeatureId; slot: string; deleted: FeatureId }
  | { code: 'collab.conflict.cycle' | 'collab.conflict.forward-ref' | 'collab.conflict.duplicate-id'; ids: FeatureId[] }
  | { code: 'collab.conflict.invalid-value'; target: string; name: string; reason: string }
  | { code: 'collab.conflict.same-feature'; id: FeatureId }
  | { code: 'collab.conflict.unowned'; span: SourceSpan };

export type MergeResult =
  | { status: 'merged'; source: string; graph: FeatureGraph; rebased: boolean }
  | { status: 'conflict'; conflicts: CollabConflict[] };

export interface Footprint {
  writes: Set<FeatureId>;
  reads: Set<FeatureId>;
  downstream: Set<FeatureId>;
  requirements: Set<string>;
}

/** One revision's evaluated state, reduced to what the gate compares. */
export interface EvaluatedRevision {
  revision: number;
  features: Map<FeatureId, 'ok' | 'error'>;
  requirements: RequirementLedgerEntry[];
  selections: SelectionRecord[];
}

export type GateReason =
  | { code: 'collab.gate.feature-failed'; id: FeatureId }
  | { code: 'collab.gate.binding-changed'; change: SelectionBindingChange }
  | { code: 'collab.gate.requirement-failed'; name: string; measured?: number; limit?: number; closure: FeatureId[] }
  | { code: 'collab.gate.evaluation-failed'; diagnostics: unknown[] };

export type GateVerdict =
  | { status: 'pass'; evaluated: EvaluatedRevision; preexisting: string[]; notes?: string[] }
  | { status: 'reject'; reasons: GateReason[]; evaluated?: EvaluatedRevision };
