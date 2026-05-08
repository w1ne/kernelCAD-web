// src/diagnostics/nextAction.ts
//
// Structured "what to try next" actions per diagnostic code. Sibling to
// HINT_TEMPLATES — the wire-level `hint` string remains the canonical
// agent-facing form; `nextAction` is auxiliary data used by the eval
// harness to bucket retry-success rates per code.
//
// The kinds below cover the full set of recoveries the milestone-C codes
// describe. Adding a new kind requires extending NEXT_ACTIONS for every
// existing code that fits — covered by tests/unit/diagnostics/nextAction.test.ts.
import type { DiagnosticCode } from './codes';

export type NextAction =
  | { kind: 'retry-with-smaller-param'; param: string; factor: number }
  | { kind: 'call-introspection-tool'; tool: string }
  | { kind: 'rewrite-feature'; guidance: string }
  | { kind: 'reorder-pipeline'; guidance: string }
  | { kind: 'fix-arg'; field: string }
  | { kind: 'inspect-message' }
  | { kind: 'rename'; guidance: string }
  | { kind: 'add-return' }
  | { kind: 'check-cli-args' }
  | { kind: 'check-file-path' };

export const NEXT_ACTIONS: Record<DiagnosticCode, NextAction> = {
  'feature.invalid-args':                     { kind: 'fix-arg', field: 'see-message' },
  'feature.kernel-failed':                    { kind: 'retry-with-smaller-param', param: 'op-radius-or-thickness', factor: 0.5 },
  'feature.revolve.crosses-axis':             { kind: 'rewrite-feature', guidance: 'clamp all path coords to x >= 0' },
  'feature.sketch.degenerate-arc':            { kind: 'retry-with-smaller-param', param: 'arc-radius-or-endpoints', factor: 0.5 },
  'feature.face-ref.not-resolvable':          { kind: 'reorder-pipeline', guidance: 'apply this feature before any transform' },
  'feature.face-ref.not-applicable':          { kind: 'rewrite-feature', guidance: 'use a different primitive or inline FaceQuery' },
  'feature.face-ref.not-supported':           { kind: 'rewrite-feature', guidance: 'use a canonical face name, label, or inline FaceQuery / EdgeQuery' },
  'feature.face-ref.ambiguous-after-split':   { kind: 'reorder-pipeline', guidance: 'apply this feature before the splitting boolean' },
  'feature.face-ref.removed':                 { kind: 'rewrite-feature', guidance: 'reference a face that still exists' },
  'feature.selection.no-match':               { kind: 'call-introspection-tool', tool: 'list_edges' },
  'feature.selection.ambiguous':              { kind: 'rewrite-feature', guidance: 'use the plural selector or tighten the query' },
  'feature.label.unknown-name':               { kind: 'call-introspection-tool', tool: 'list_face_labels' },
  'feature.label.no-upstream-sketch':         { kind: 'rewrite-feature', guidance: 'use an inline face/edge query for primitives or imported shapes' },
  'feature.label.unsupported-base':           { kind: 'rewrite-feature', guidance: 'use an inline query as a workaround' },
  'feature.label.mixed-convexity':            { kind: 'rewrite-feature', guidance: 'split the label or filter by convexity' },
  'feature.label.collision':                  { kind: 'rename', guidance: 'two upstream features declared the same label name; rename one' },
  'recompute.input.missing':                  { kind: 'call-introspection-tool', tool: 'why_did_this_fail' },
  'recompute.lowering.exception':             { kind: 'inspect-message' },
  'cli.invalid-args':                         { kind: 'check-cli-args' },
  'cli.script-exception':                     { kind: 'inspect-message' },
  'cli.file-read':                            { kind: 'check-file-path' },
  'cli.export-exception':                     { kind: 'inspect-message' },
  'export.feature-not-found':                 { kind: 'call-introspection-tool', tool: 'list_features' },
  'export.no-shape':                          { kind: 'add-return' },
};
