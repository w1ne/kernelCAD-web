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
  // Hole-specific target (1)
  | 'feature.hole.no-target-face'
  // Created-ref fallback (1, warning)
  | 'feature.created-ref.fallback-used'
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
  | 'export.no-shape'
  // NURBS surfaces (2) — W1.3
  | 'feature.nurbs.degenerate-controls'
  | 'feature.nurbs.degree-mismatch'
  // Pattern (2) — W2.1
  | 'feature.pattern.source-not-found'
  | 'feature.pattern.count-out-of-range'
  // Sheet metal slice 1 (3) — W2.2
  | 'feature.sheetMetal.kfactor-invalid'
  | 'feature.bend.edge-not-linear'
  | 'feature.flattenPattern.multi-bend-unsupported'
  // SDF (2) — W2.3
  | 'feature.sdf.field-undefined'
  | 'feature.sdf.materialize-resolution-out-of-range'
  // Reference image (4) — Slice A
  | 'feature.reference-image.path-not-found'
  | 'feature.reference-image.invalid-plane'
  | 'feature.reference-image.scale-out-of-range'
  | 'feature.reference-image.format-unsupported'
  // Material (2) — Slice A
  | 'feature.material.invalid-base-color'
  | 'feature.material.value-clamped';

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
  'feature.hole.no-target-face',
  'feature.created-ref.fallback-used',
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
  'feature.nurbs.degenerate-controls',
  'feature.nurbs.degree-mismatch',
  'feature.pattern.source-not-found',
  'feature.pattern.count-out-of-range',
  'feature.sheetMetal.kfactor-invalid',
  'feature.bend.edge-not-linear',
  'feature.flattenPattern.multi-bend-unsupported',
  'feature.sdf.field-undefined',
  'feature.sdf.materialize-resolution-out-of-range',
  'feature.reference-image.path-not-found',
  'feature.reference-image.invalid-plane',
  'feature.reference-image.scale-out-of-range',
  'feature.reference-image.format-unsupported',
  'feature.material.invalid-base-color',
  'feature.material.value-clamped',
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
    'feature.hole.no-target-face':
      'The hole entry face matched, but no body sits along the bore axis to drill into. Pick an entry face on a different body, or verify the target body extends along the bore axis.',
    'feature.created-ref.fallback-used':
      'Geometry-snapshot fallback used. Name the upstream feature with .name() and reference it by `<name>.<slot>` to lock the ref against future history edits.',
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
    'feature.nurbs.degenerate-controls':
      'NURBS surface control-net must be a non-empty rectangular Vec3 grid spanning a 2D extent. Fix the controls grid shape (every row must have the same length; every point must be a finite Vec3).',
    'feature.nurbs.degree-mismatch':
      'NURBS degree must satisfy 1 <= degree.u <= controls.length - 1 and 1 <= degree.v <= controls[0].length - 1. Reduce degree, or add control points.',
    'feature.pattern.source-not-found':
      "The pattern source feature was not found. Verify the variable receiving .patternLinear / .patternCircular / .patternGrid is bound from an earlier feature, that the source feature is not suppressed, and that the source FeatureId matches what list_features reports.",
    'feature.pattern.count-out-of-range':
      "Pattern count must be an integer >= 2. For grid patterns, both x.count and y.count must be >= 2. If count is a Param, set { min: 2 } on the Param declaration so updates can't lower it below the valid range.",
    'feature.sheetMetal.kfactor-invalid':
      'K-factor must be a finite number in [0, 1]; typical mild-steel/aluminum values are 0.33–0.45. Adjust the kFactor argument to sheetMetal().',
    'feature.bend.edge-not-linear':
      '.bend() requires a linear edge; the resolved edge is a curved geometry. Pick an edge that lies on a straight perimeter of the sheet (use list_edges to inspect).',
    'feature.flattenPattern.multi-bend-unsupported':
      '.flattenPattern() supports at most 2 bends in slice 1. Flatten an upstream Shape with two or fewer bends, or wait for slice 2.',
    'feature.sdf.field-undefined':
      'The SDF returned NaN/Infinity at a sample point. Check the field composition — smoothBlend with k <= 0 is undefined, and divide-by-zero inside a custom field produces NaN. Use evaluate_sdf to probe a point near the failure before retrying.',
    'feature.sdf.materialize-resolution-out-of-range':
      'sdf.materialize resolution must be an integer in [10, 200]. Use 30-60 for typical brackets; 80-120 for fine smooth-blends; <30 only when previewing. 200 is the cap to prevent OOM (200^3 = 8M voxels).',
    'feature.reference-image.path-not-found':
      "reference-image.path-not-found — pass a path that exists relative to the .kcad.ts file.",
    'feature.reference-image.invalid-plane':
      "reference-image.invalid-plane — plane must be 'xy', 'xz', 'yz', or { plane: <cardinal>, offset?: number }.",
    'feature.reference-image.scale-out-of-range':
      "reference-image.scale-out-of-range — pass a scale > 0 and ≤ 10000 mm, or use 'fit-bbox'.",
    'feature.reference-image.format-unsupported':
      'reference-image.format-unsupported — supported formats: .png, .jpg, .jpeg, .webp.',
    'feature.material.invalid-base-color':
      'material.invalid-base-color — pass a CSS color string or a registered role token to baseColor.',
    'feature.material.value-clamped':
      'material.value-clamped — numeric PBR fields are clamped to [0, 1] (ior to [1.0, 2.5]).',
  };
  const out = {} as Record<DiagnosticCode, HintTemplate>;
  for (const code of DIAGNOSTIC_CODES) {
    out[code] = { template: templates[code], nextAction: NEXT_ACTIONS[code] };
  }
  return out;
}
export const HINT_TEMPLATES: Record<DiagnosticCode, HintTemplate> = buildHintTemplates();
