// Single source of truth for the kernelCAD agent-facing diagnostic
// vocabulary. Every code below corresponds to a distinct recovery action
// an agent would take. See spec 2026-05-05-diagnostic-vocabulary-milestone-c.
//
// Add a new code only when no existing code corresponds to its recovery.
// Removing or renaming any code is a breaking change to the agent contract.

import type { NextAction } from './nextAction';
import { NEXT_ACTIONS } from './nextAction';

export type DiagnosticCode =
  // Args & validation (1)
  | 'feature.invalid-args'
  // Kernel op failed (1)
  | 'feature.kernel-failed'
  // Specific retries (2)
  | 'feature.revolve.crosses-axis'
  | 'feature.sketch.degenerate-arc'
  // Text (2)
  | 'sketch.text.font-not-found'
  | 'sketch.text.empty-content'
  // Face-ref state (5)
  | 'feature.face-ref.not-resolvable'
  | 'feature.face-ref.not-applicable'
  | 'feature.face-ref.not-supported'
  | 'feature.face-ref.ambiguous-after-split'
  | 'feature.face-ref.removed'
  // Selection (2)
  | 'feature.selection.no-match'
  | 'feature.selection.ambiguous'
  // Label state (5)
  | 'feature.label.unknown-name'
  | 'feature.label.no-upstream-sketch'
  | 'feature.label.unsupported-base'
  | 'feature.label.mixed-convexity'
  | 'feature.label.collision'
  // Pipeline (2)
  | 'recompute.input.missing'
  | 'recompute.lowering.exception'
  // CLI / IO (4)
  | 'cli.invalid-args'
  | 'cli.script-exception'
  | 'cli.file-read'
  | 'cli.export-exception'
  // Export (2)
  | 'export.feature-not-found'
  | 'export.no-shape';

export const DIAGNOSTIC_CODES: readonly DiagnosticCode[] = [
  'feature.invalid-args',
  'feature.kernel-failed',
  'feature.revolve.crosses-axis',
  'feature.sketch.degenerate-arc',
  'sketch.text.font-not-found',
  'sketch.text.empty-content',
  'feature.face-ref.not-resolvable',
  'feature.face-ref.not-applicable',
  'feature.face-ref.not-supported',
  'feature.face-ref.ambiguous-after-split',
  'feature.face-ref.removed',
  'feature.selection.no-match',
  'feature.selection.ambiguous',
  'feature.label.unknown-name',
  'feature.label.no-upstream-sketch',
  'feature.label.unsupported-base',
  'feature.label.mixed-convexity',
  'feature.label.collision',
  'recompute.input.missing',
  'recompute.lowering.exception',
  'cli.invalid-args',
  'cli.script-exception',
  'cli.file-read',
  'cli.export-exception',
  'export.feature-not-found',
  'export.no-shape',
] as const;

export interface HintTemplate {
  /** Imperative one-sentence agent recovery instruction. */
  template: string;
  /** Structured form of the recovery instruction. Sibling to `template`. */
  nextAction: NextAction;
}

/**
 * Hint templates per code. The actual `hint` field on a diagnostic may be
 * either this template verbatim or a more specific specialization (e.g.
 * `feature.kernel-failed` dispatches per-op via the emission site).
 */
function buildHintTemplates(): Record<DiagnosticCode, HintTemplate> {
  const templates: Record<DiagnosticCode, string> = {
    'feature.invalid-args':
      'Fix the named field on the call args; check type, sign, and units.',
    'feature.kernel-failed':
      'OCCT rejected the operation. Retry with different params: smaller fillet/chamfer radius, thinner shell wall, translated mirror source, smaller sweep profile, etc.',
    'feature.revolve.crosses-axis':
      'A revolve profile must stay on one side of the rotation axis. Clamp all path coordinates to x >= 0.',
    'feature.sketch.degenerate-arc':
      'The arc segment is degenerate. Try a larger radius, different endpoints, or another arc constructor.',
    'sketch.text.font-not-found':
      "The font name is not registered. Use fontPath('/path/to/font.ttf') to load a TTF from disk, or omit opts.font to use the bundled Liberation Sans.",
    'sketch.text.empty-content':
      'sketch.text(content) requires a non-empty string with at least one printable glyph.',
    'feature.face-ref.not-resolvable':
      'Canonical face refs only work on un-transformed primitives. Apply this feature before any transform, or fillet/shell the primitive first then translate.',
    'feature.face-ref.not-applicable':
      "That canonical face doesn't exist on this primitive (sphere has no canonical faces; cylinder has only top/bottom).",
    'feature.face-ref.not-supported':
      'Use a canonical face name, a label, or an inline FaceQuery / EdgeQuery instead.',
    'feature.face-ref.ambiguous-after-split':
      'A named face was split by an upstream boolean. Apply this feature before the splitting boolean.',
    'feature.face-ref.removed':
      'A named face was removed by an upstream boolean. Reference a face that still exists.',
    'feature.selection.no-match':
      'The query matched no edges/faces. Use list_edges, list_faces, or list_face_labels to inspect what exists, then relax the query.',
    'feature.selection.ambiguous':
      'Multiple edges/faces match. Use the plural selector for all matches, or tighten the query.',
    'feature.label.unknown-name':
      'Label not found. Call list_face_labels to see available labels.',
    'feature.label.no-upstream-sketch':
      'Labels work on shapes built from a path() sketch. For primitives or imported shapes, use an inline face/edge query instead.',
    'feature.label.unsupported-base':
      'Labels are supported for extrude only today. Use an inline query as a workaround.',
    'feature.label.mixed-convexity':
      'The labeled segment matched a mix of convex and concave edges. Split the label across smaller segments, or refine with an EdgeQuery filtering by convexity.',
    'feature.label.collision':
      'Two upstream features declared the same faceLabels name. Rename one.',
    'recompute.input.missing':
      'An upstream feature failed or was suppressed. Call why_did_this_fail on the upstream feature_id to walk the chain.',
    'recompute.lowering.exception':
      'An exception was raised during lowering. Read the diagnostic message for the OCCT error.',
    'cli.invalid-args':
      'CLI was called with missing or malformed arguments. Run `kernelcad --help`.',
    'cli.script-exception':
      'Your script raised an exception during execution. Read the diagnostic message for the JS error.',
    'cli.file-read':
      'kernelCAD could not read the script file. Check the path exists and is readable.',
    'cli.export-exception':
      'An exception occurred during export. Read the diagnostic message for details.',
    'export.feature-not-found':
      'The feature_id passed to export_stl was not found. Use list_features to see available IDs.',
    'export.no-shape':
      'The script did not return a shape. End the script with `return <shape>`.',
  };
  const out = {} as Record<DiagnosticCode, HintTemplate>;
  for (const code of DIAGNOSTIC_CODES) {
    out[code] = { template: templates[code], nextAction: NEXT_ACTIONS[code] };
  }
  return out;
}
export const HINT_TEMPLATES: Record<DiagnosticCode, HintTemplate> = buildHintTemplates();
