// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { NextAction } from '../nextAction';

export type DiagnosticGroup =
  | 'feature'
  | 'sketch'
  | 'recompute'
  | 'cli'
  | 'export'
  | 'assembly'
  | 'mesher'
  | 'tool'
  | 'parts'
  | 'dfm'
  | 'query'
  | 'kinematic'
  | 'mechanism'
  | 'animation'
  | 'drawing'
  | 'reference'
  | 'fea'
  | 'diff'
  | 'bom'
  | 'render'
  | 'inspect';

export type DiagnosticSeverityLevel = 'info' | 'warn' | 'error';

export interface DiagnosticCodeSpec {
  /** Imperative one-sentence agent recovery instruction. */
  hintTemplate: string;
  /** Structured form of the recovery instruction. */
  nextAction: NextAction;
  /** Dominant severity at emit sites — informational default for callers
   *  that don't pick a severity explicitly. Some codes are emitted at
   *  more than one severity (e.g. short-edges-skipped emits 'warn' for
   *  partial success and 'error' when no edges survive); in that case
   *  the more serious level is recorded here. */
  defaultSeverity: DiagnosticSeverityLevel;
  /** Top-level namespace this code belongs to (derived from the prefix). */
  group: DiagnosticGroup;
  /** One-sentence statement of the condition that triggers this code. */
  description: string;
}
