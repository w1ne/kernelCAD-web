// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Wire types for trace-guided repair. Kept free of kernel imports so the MCP
// output schemas, the CLI trace file, and the skill documentation all describe
// the same shapes.

import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import type { FeatureKind, ScriptLocation } from '../../shared/intent/types';
import type { ScriptRange } from './scriptSpans';

export type { ScriptRange };

export type FeatureHealth = 'healthy' | 'warning' | 'error' | 'unknown';

/**
 * One modeling step, joined to the script text that authored it and to the
 * evidence that it failed. This is the persistent link the repair loop walks:
 * feature → AST node range → diagnostics → upstream inputs / downstream
 * dependents.
 */
export interface FeatureTraceEntry {
  feature_id: string;
  kind: FeatureKind;
  health: FeatureHealth;
  /** Call site the feature was captured at. Absent when the capture graph was
   *  built without a running script (programmatic sessions). */
  location?: ScriptLocation;
  /** AST range of the call expression that captured the feature. */
  nodeRange?: ScriptRange;
  /** AST range of the statement enclosing that call. */
  statementRange?: ScriptRange;
  /** Diagnostics attributed to this feature. */
  diagnostics: CompilerDiagnostic[];
  /** Feature ids this feature consumes. */
  inputs: string[];
  /** Feature ids that consume this feature. */
  dependents: string[];
  /** Named script parameters this feature reads. */
  paramRefs: string[];
}

export interface RepairRegionRange extends ScriptRange {
  /** Why these lines are editable for this failure. */
  role: 'failing-feature' | 'input-feature' | 'parameter-source';
  featureId?: string;
  paramName?: string;
}

/** The only lines a repair is permitted to rewrite. */
export interface RepairRegion {
  file: string;
  ranges: RepairRegionRange[];
}

/**
 * A line-range replacement carrying the exact text it expects to replace.
 * Anchoring on `before` makes application verifiable: a drifted file is
 * refused instead of silently mangled.
 */
export interface RepairPatch {
  startLine: number;
  endLine: number;
  before: string;
  after: string;
}

export interface RepairCandidate {
  /** Stable within one `why_did_this_fail` / `repair_script` response. */
  id: string;
  /** The diagnostic this candidate is meant to clear. */
  diagnosticId: string;
  code: DiagnosticCode;
  featureId?: string;
  /** One line: what the edit does. */
  summary: string;
  /** One line: what the model should look like afterwards. */
  predictedEffect: string;
  patch: RepairPatch;
  /** Numbers and names the fix was derived from, so an agent can audit it
   *  instead of trusting it. */
  evidence: Record<string, string | number>;
}

export type CandidateStatus = 'candidates' | 'no-automatic-candidate';

/** Identity for one diagnostic within a single evaluation. Diagnostics have no
 *  server-assigned id, so the selector is derived deterministically from the
 *  fields that distinguish them. */
export function diagnosticId(diagnostic: CompilerDiagnostic, index: number): string {
  return `${diagnostic.code}@${diagnostic.featureId ?? 'script'}#${index}`;
}
