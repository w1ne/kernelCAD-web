// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

/** Tier-1 structural merge and tier-3 gate outcomes for collaborative edits.
 *  These are returned as data by `src/collab`; the CLI/hosted layer projects
 *  them to the agent-facing diagnostic vocabulary. */
export const COLLAB_CODES = {
  'collab.conflict.param': {
    hintTemplate:
      'Both sides changed the same parameter to different values. Re-read head, keep one value or the other, and resubmit; this merge never picks a winner silently.',
    nextAction: { kind: 'rewrite-feature', guidance: 'reconcile the two parameter values against the current head' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'The same parameter was set to different values on head and in the submitted change-set.',
  },
  'collab.conflict.deleted-ref': {
    hintTemplate:
      'The change references a feature that head deleted. Remove the reference or reintroduce the feature in a new change-set.',
    nextAction: { kind: 'rewrite-feature', guidance: 'drop or replace the reference to the deleted feature' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'A feature input points at a feature id that no longer exists after the merge.',
  },
  'collab.conflict.cycle': {
    hintTemplate:
      'The merged references form a cycle. Break the cycle by removing one reference before resubmitting.',
    nextAction: { kind: 'rewrite-feature', guidance: 'remove one edge of the reported reference cycle' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'Merged feature references contain a cycle.',
  },
  'collab.conflict.forward-ref': {
    hintTemplate:
      'The change makes a feature reference a feature defined later in the script. Move the definition earlier or remove the reference.',
    nextAction: { kind: 'reorder-pipeline', guidance: 'define the referenced feature before the consumer' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'A feature reference points forward in the merged feature order.',
  },
  'collab.conflict.duplicate-id': {
    hintTemplate:
      'The change reuses a feature id that head already inserted with different content. Re-lift the edit against the new head.',
    nextAction: { kind: 'rewrite-feature', guidance: 'rebase the inserted feature on the current head ids' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'Two merged features claim the same feature id.',
  },
  'collab.conflict.invalid-value': {
    hintTemplate:
      'The merged parameter value violates its declared type or range. Choose a value inside the declaration and resubmit.',
    nextAction: { kind: 'fix-arg', field: 'value' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'A merged parameter value fails the declaration type or range check.',
  },
  'collab.conflict.same-feature': {
    hintTemplate:
      'Both sides changed the same feature in a way this merge cannot combine. Re-read head and resubmit one coherent edit.',
    nextAction: { kind: 'rewrite-feature', guidance: 're-read head and resubmit the intended single-feature change' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'Overlapping edits to one feature could not be combined cell by cell.',
  },
  'collab.conflict.unowned': {
    hintTemplate:
      'Both sides changed the same helper/import text. Reconcile the helper body against head and resubmit.',
    nextAction: { kind: 'rewrite-feature', guidance: 'merge the helper text by hand against the current head' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'Both parents changed the same source span that no feature owns.',
  },
  'collab.gate.feature-failed': {
    hintTemplate:
      'A feature that built at head now fails in the merged candidate. Repair that feature before resubmitting.',
    nextAction: { kind: 'rewrite-feature', guidance: 'repair the feature that fails only in the merged candidate' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'The merged candidate fails to evaluate a feature that was healthy at head.',
  },
  'collab.gate.binding-changed': {
    hintTemplate:
      'A selector now binds to a different entity in the merged candidate. Tighten the selector or move the edit so it keeps the intended face/edge.',
    nextAction: { kind: 'rewrite-feature', guidance: 'tighten the selector that re-bound in the merged candidate' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'A selector binding changed in the merged candidate outside the change-set write set.',
  },
  'collab.gate.requirement-failed': {
    hintTemplate:
      'A requirement that passed at head fails in the merged candidate. Use the measured value, limit and feature closure to repair the edit.',
    nextAction: { kind: 'rewrite-feature', guidance: 'repair the features in the failing requirement closure' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'The merged candidate violates a requirement that was green at head.',
  },
  'collab.gate.evaluation-failed': {
    hintTemplate:
      'The merged candidate could not be evaluated. Fix the evaluation error before resubmitting; nothing was landed.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'collab',
    description: 'Evaluating the merged candidate threw, so the gate cannot pass it.',
  },
} as const satisfies Record<`collab.${string}`, DiagnosticCodeSpec>;
