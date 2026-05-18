// Single source of truth for the kernelCAD agent-facing diagnostic
// vocabulary. Every entry below corresponds to a distinct recovery action
// an agent would take. See spec 2026-05-05-diagnostic-vocabulary-milestone-c.
//
// Add a new code only when no existing code corresponds to its recovery.
// Removing or renaming any code is a breaking change to the agent contract.
//
// All four agent-facing views (DiagnosticCode union, DIAGNOSTIC_CODES array,
// HINT_TEMPLATES, NEXT_ACTIONS) are derived as projections of this registry —
// add a new code here and they all stay consistent automatically.

import type { NextAction } from './nextAction';

export type DiagnosticGroup =
  | 'feature'
  | 'sketch'
  | 'recompute'
  | 'cli'
  | 'export'
  | 'assembly'
  | 'mesher';

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

export const DIAGNOSTIC_REGISTRY = {
  // Args & validation (1)
  'feature.invalid-args': {
    hintTemplate: 'Fix the named field on the call args; check type, sign, and units.',
    nextAction: { kind: 'fix-arg', field: 'see-message' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A feature call received a missing, malformed, or out-of-range argument.',
  },
  // Kernel op failed (1)
  'feature.kernel-failed': {
    hintTemplate:
      'OCCT rejected the operation. Retry with different params: smaller fillet/chamfer radius, thinner shell wall, translated mirror source, smaller sweep profile, etc.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'op-radius-or-thickness', factor: 0.5 },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'The underlying OCCT kernel call failed at runtime for an op-specific reason.',
  },
  // Specific retries (2)
  'feature.revolve.crosses-axis': {
    hintTemplate:
      'A revolve profile must stay on one side of the rotation axis. Clamp all path coordinates to x >= 0.',
    nextAction: { kind: 'rewrite-feature', guidance: 'clamp all path coords to x >= 0' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A revolve profile crosses the rotation axis instead of staying on one side.',
  },
  'feature.sketch.degenerate-arc': {
    hintTemplate:
      'The arc segment is degenerate. Try a larger radius, different endpoints, or another arc constructor.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'arc-radius-or-endpoints', factor: 0.5 },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'An arc segment in a sketch is degenerate (radius too small, collinear endpoints, etc.).',
  },
  // Text (2)
  'sketch.text.font-not-found': {
    hintTemplate:
      "The font name is not registered. Use fontPath('/path/to/font.ttf') to load a TTF from disk, or omit opts.font to use the bundled Liberation Sans.",
    nextAction: { kind: 'fix-arg', field: 'font' },
    defaultSeverity: 'error',
    group: 'sketch',
    description: 'sketch.text() was called with a font name that is not registered with the kernel.',
  },
  'sketch.text.empty-content': {
    hintTemplate:
      'sketch.text(content) requires a non-empty string with at least one printable glyph.',
    nextAction: { kind: 'fix-arg', field: 'content' },
    defaultSeverity: 'error',
    group: 'sketch',
    description: 'sketch.text() was called with empty or whitespace-only content.',
  },
  // Face-ref state (5)
  'feature.face-ref.not-resolvable': {
    hintTemplate:
      'Canonical face refs only work on un-transformed primitives. Apply this feature before any transform, or fillet/shell the primitive first then translate.',
    nextAction: { kind: 'reorder-pipeline', guidance: 'apply this feature before any transform' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A face reference could not be resolved to a concrete topological face.',
  },
  'feature.face-ref.not-applicable': {
    hintTemplate:
      "That canonical face doesn't exist on this primitive (sphere has no canonical faces; cylinder has only top/bottom).",
    nextAction: { kind: 'rewrite-feature', guidance: 'use a different primitive or inline FaceQuery' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A canonical face name was requested on a primitive that does not expose that face.',
  },
  'feature.face-ref.not-supported': {
    hintTemplate:
      'Use a canonical face name, a label, or an inline FaceQuery / EdgeQuery instead.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'use a canonical face name, label, or inline FaceQuery / EdgeQuery',
    },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A face-reference form was used that the current feature does not support.',
  },
  'feature.face-ref.ambiguous-after-split': {
    hintTemplate:
      'A named face was split by an upstream boolean. Apply this feature before the splitting boolean.',
    nextAction: { kind: 'reorder-pipeline', guidance: 'apply this feature before the splitting boolean' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A named face was split into multiple faces by an upstream boolean and the ref is now ambiguous.',
  },
  'feature.face-ref.removed': {
    hintTemplate:
      'A named face was removed by an upstream boolean. Reference a face that still exists.',
    nextAction: { kind: 'rewrite-feature', guidance: 'reference a face that still exists' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A named face was removed by an upstream boolean and no longer exists in the resolved shape.',
  },
  // Hole-specific target (1)
  'feature.hole.no-target-face': {
    hintTemplate:
      'The hole entry face matched, but no body sits along the bore axis to drill into. Pick an entry face on a different body, or verify the target body extends along the bore axis.',
    nextAction: { kind: 'rewrite-feature', guidance: 'pick an entry face on a body the bore axis enters' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A hole feature found its entry face but no solid body lies along the bore axis.',
  },
  // Created-ref fallback (1, warning)
  'feature.created-ref.fallback-used': {
    hintTemplate:
      'Geometry-snapshot fallback used. Name the upstream feature with .name() and reference it by `<name>.<slot>` to lock the ref against future history edits.',
    nextAction: { kind: 'rename', guidance: 'name the upstream feature with .name() to lock the ref' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'A created-ref was resolved via the geometry-snapshot fallback path instead of the topology-stable route.',
  },
  // Selection (2)
  'feature.selection.no-match': {
    hintTemplate:
      'The query matched no edges/faces. Use list_edges, list_faces, or list_face_labels to inspect what exists, then relax the query.',
    nextAction: { kind: 'call-introspection-tool', tool: 'list_edges' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A face/edge query matched zero elements.',
  },
  'feature.selection.ambiguous': {
    hintTemplate:
      'Multiple edges/faces match. Use the plural selector for all matches, or tighten the query.',
    nextAction: { kind: 'rewrite-feature', guidance: 'use the plural selector or tighten the query' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A singular face/edge query matched more than one element.',
  },
  // Label state (5)
  'feature.label.unknown-name': {
    hintTemplate: 'Label not found. Call list_face_labels to see available labels.',
    nextAction: { kind: 'call-introspection-tool', tool: 'list_face_labels' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A face/edge label was referenced that no upstream feature declares.',
  },
  'feature.label.no-upstream-sketch': {
    hintTemplate:
      'Labels work on shapes built from a path() sketch. For primitives or imported shapes, use an inline face/edge query instead.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'use an inline face/edge query for primitives or imported shapes',
    },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A label was used on a shape that does not have an upstream sketch to attach labels to.',
  },
  'feature.label.unsupported-base': {
    hintTemplate:
      'Labels are supported for extrude only today. Use an inline query as a workaround.',
    nextAction: { kind: 'rewrite-feature', guidance: 'use an inline query as a workaround' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A label was used on a base operation that does not yet support labels.',
  },
  'feature.label.mixed-convexity': {
    hintTemplate:
      'The labeled segment matched a mix of convex and concave edges. Split the label across smaller segments, or refine with an EdgeQuery filtering by convexity.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split the label or filter by convexity' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A label resolved to a mix of convex and concave edges, which the downstream op cannot accept.',
  },
  'feature.label.collision': {
    hintTemplate: 'Two upstream features declared the same faceLabels name. Rename one.',
    nextAction: {
      kind: 'rename',
      guidance: 'two upstream features declared the same label name; rename one',
    },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Two upstream features declared the same label name, producing an ambiguous resolution.',
  },
  // Pipeline (2)
  'recompute.input.missing': {
    hintTemplate:
      'An upstream feature failed or was suppressed. Call why_did_this_fail on the upstream feature_id to walk the chain.',
    nextAction: { kind: 'call-introspection-tool', tool: 'why_did_this_fail' },
    defaultSeverity: 'error',
    group: 'recompute',
    description: 'A feature could not run because an upstream input was missing, failed, or suppressed.',
  },
  'recompute.lowering.exception': {
    hintTemplate:
      'An exception was raised during lowering. Read the diagnostic message for the OCCT error.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'recompute',
    description: 'The lowering pass raised an unhandled exception while compiling intent to the backend.',
  },
  // CLI / IO (4)
  'cli.invalid-args': {
    hintTemplate: 'CLI was called with missing or malformed arguments. Run `kernelcad --help`.',
    nextAction: { kind: 'check-cli-args' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'The kernelcad CLI was invoked with missing or malformed arguments.',
  },
  'cli.script-exception': {
    hintTemplate:
      'Your script raised an exception during execution. Read the diagnostic message for the JS error.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'The user script raised an uncaught JavaScript exception during execution.',
  },
  'cli.file-read': {
    hintTemplate: 'kernelCAD could not read the script file. Check the path exists and is readable.',
    nextAction: { kind: 'check-file-path' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'kernelCAD could not read the script file at the given path.',
  },
  'cli.export-exception': {
    hintTemplate: 'An exception occurred during export. Read the diagnostic message for details.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'An unhandled exception occurred during an export operation (STL, STEP, etc.).',
  },
  // Export (2)
  'export.feature-not-found': {
    hintTemplate:
      'The feature_id passed to export_stl was not found. Use list_features to see available IDs.',
    nextAction: { kind: 'call-introspection-tool', tool: 'list_features' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'An export tool received a feature_id that does not match any feature in the recompute graph.',
  },
  'export.no-shape': {
    hintTemplate: 'The script did not return a shape. End the script with `return <shape>`.',
    nextAction: { kind: 'add-return' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'The script produced no shape to export (no return value and no captured records).',
  },
  // NURBS surfaces (2) — W1.3
  'feature.nurbs.degenerate-controls': {
    hintTemplate:
      'NURBS surface control-net must be a non-empty rectangular Vec3 grid spanning a 2D extent. Fix the controls grid shape (every row must have the same length; every point must be a finite Vec3).',
    nextAction: { kind: 'fix-arg', field: 'controls' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A NURBS surface received a degenerate or non-rectangular control-point grid.',
  },
  'feature.nurbs.degree-mismatch': {
    hintTemplate:
      'NURBS degree must satisfy 1 <= degree.u <= controls.length - 1 and 1 <= degree.v <= controls[0].length - 1. Reduce degree, or add control points.',
    nextAction: { kind: 'fix-arg', field: 'degree' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A NURBS surface degree is incompatible with its control-net dimensions.',
  },
  // Pattern (2) — W2.1
  'feature.pattern.source-not-found': {
    hintTemplate:
      "The pattern source feature was not found. Verify the variable receiving .patternLinear / .patternCircular / .patternGrid is bound from an earlier feature, that the source feature is not suppressed, and that the source FeatureId matches what list_features reports.",
    nextAction: { kind: 'call-introspection-tool', tool: 'list_features' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A pattern feature could not locate its source feature in the recompute graph.',
  },
  'feature.pattern.count-out-of-range': {
    hintTemplate:
      "Pattern count must be an integer >= 2. For grid patterns, both x.count and y.count must be >= 2. If count is a Param, set { min: 2 } on the Param declaration so updates can't lower it below the valid range.",
    nextAction: { kind: 'fix-arg', field: 'count' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A pattern feature received a count below the minimum (2) or otherwise out of range.',
  },
  // Sheet metal slice 1 (3) — W2.2
  'feature.sheetMetal.kfactor-invalid': {
    hintTemplate:
      'K-factor must be a finite number in [0, 1]; typical mild-steel/aluminum values are 0.33–0.45. Adjust the kFactor argument to sheetMetal().',
    nextAction: { kind: 'fix-arg', field: 'kFactor' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'sheetMetal() received a K-factor outside the valid [0, 1] range.',
  },
  'feature.bend.edge-not-linear': {
    hintTemplate:
      '.bend() requires a linear edge; the resolved edge is a curved geometry. Pick an edge that lies on a straight perimeter of the sheet (use list_edges to inspect).',
    nextAction: { kind: 'rewrite-feature', guidance: 'pick a linear edge on the sheet perimeter' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A .bend() call targeted an edge that is curved rather than linear.',
  },
  'feature.flattenPattern.multi-bend-unsupported': {
    hintTemplate:
      '.flattenPattern() supports at most 2 bends in slice 1. Flatten an upstream Shape with two or fewer bends, or wait for slice 2.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'flatten an upstream Shape with <= 2 bends (slice-1 limit)',
    },
    defaultSeverity: 'error',
    group: 'feature',
    description: '.flattenPattern() was called on a Shape with more than 2 bends, exceeding the slice-1 limit.',
  },
  // SDF (2) — W2.3
  'feature.sdf.field-undefined': {
    hintTemplate:
      'The SDF returned NaN/Infinity at a sample point. Check the field composition — smoothBlend with k <= 0 is undefined, and divide-by-zero inside a custom field produces NaN. Use evaluate_sdf to probe a point near the failure before retrying.',
    nextAction: { kind: 'call-introspection-tool', tool: 'evaluate_sdf' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'An SDF field returned NaN or Infinity at a sample point during materialization.',
  },
  'feature.sdf.materialize-resolution-out-of-range': {
    hintTemplate:
      'sdf.materialize resolution must be an integer in [10, 200]. Use 30-60 for typical brackets; 80-120 for fine smooth-blends; <30 only when previewing. 200 is the cap to prevent OOM (200^3 = 8M voxels).',
    nextAction: { kind: 'fix-arg', field: 'resolution' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'sdf.materialize received a resolution outside the supported [10, 200] range.',
  },
  // Reference image (4) — Slice A
  'feature.reference-image.path-not-found': {
    hintTemplate: 'Pass a path that exists relative to the .kcad.ts file.',
    nextAction: { kind: 'check-file-path' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'referenceImage() was called with a path that does not resolve to a file on disk.',
  },
  'feature.reference-image.invalid-plane': {
    hintTemplate: "Plane must be 'xy', 'xz', 'yz', or { plane: <cardinal>, offset?: number }.",
    nextAction: { kind: 'fix-arg', field: 'plane' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'referenceImage() was called with a plane argument that is not a recognized cardinal or offset form.',
  },
  'feature.reference-image.scale-out-of-range': {
    hintTemplate: "Pass a scale > 0 and ≤ 10000 mm, or use 'fit-bbox'.",
    nextAction: { kind: 'fix-arg', field: 'scale' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'referenceImage() was called with a numeric scale outside the (0, 10000] mm range.',
  },
  'feature.reference-image.format-unsupported': {
    hintTemplate: 'Supported formats: .png, .jpg, .jpeg, .webp.',
    nextAction: { kind: 'fix-arg', field: 'path' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'referenceImage() was called with a file extension outside the supported raster set.',
  },
  // Material (3) — Slice A + per-face
  'feature.material.invalid-base-color': {
    hintTemplate: 'Pass a CSS color string or a registered role token to baseColor.',
    nextAction: { kind: 'fix-arg', field: 'baseColor' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Shape.material() received a baseColor that is neither a CSS color string nor a registered role token.',
  },
  'feature.material.value-clamped': {
    hintTemplate: 'Numeric PBR fields are clamped to [0, 1] (ior to [1.0, 2.5]).',
    nextAction: { kind: 'fix-arg', field: 'see-message' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'Shape.material() received numeric PBR fields outside the canonical ranges; the kernel clamped them.',
  },
  'feature.material.face-label-no-match': {
    hintTemplate:
      "Shape.material({ face: '<label>', ... }) referenced a label that no upstream feature declares via faceLabels. The whole-shape default material is used for all faces. Declare the label on the creating op (e.g. box(..., { faceLabels: { <label>: 'top' } })) and ensure no transform strips the lineage between the creator and the .material() call. Inspect available labels with list_face_labels.",
    nextAction: { kind: 'fix-arg', field: 'face' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'Shape.material({ face }) referenced a face label that no upstream feature declares.',
  },
  // Edge-feature partial success (1) — M2
  'feature.edge-feature.short-edges-skipped': {
    hintTemplate:
      'OCCT blend solver rejects fillet/chamfer radii larger than half the target edge length. Some edges were below 2 × radius and got skipped so the rest could chamfer. Either reduce the radius, refactor upstream booleans so target edges are longer, or scope your fillet/chamfer to a face/edge query that only matches the long edges.',
    nextAction: { kind: 'fix-arg', field: 'radius-or-distance' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A fillet/chamfer skipped one or more target edges that were shorter than 2 × radius; sometimes a partial-success warn, sometimes a full-fail error.',
  },
  // Assembly UX (2)
  'assembly.placement-ignored-by-mate-fk': {
    hintTemplate:
      "The part's `at:` placement was dropped because it is positioned by mate FK from its mate parent. Either remove the `at:` and let the mate decide the pose, or place the part's local frame so it sits at the intended pose with its mate connector at the origin (mate FK composes parent_world ∘ trans(parent_conn) ∘ joint ∘ trans(-child_conn)).",
    nextAction: { kind: 'fix-arg', field: 'at' },
    defaultSeverity: 'info',
    group: 'assembly',
    description: 'A part declared both an `at:` placement and a mate parent; the `at:` was overridden by mate FK.',
  },
  'assembly.mates-ignored-by-model-call': {
    hintTemplate:
      "The assembly declared mates but the script ended with arm.model() (which skips mate FK). Replace with arm.solvedModel({}) so the mate solver runs and parts pose correctly.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'replace arm.model() with arm.solvedModel({}) so the mate solver runs',
    },
    defaultSeverity: 'info',
    group: 'assembly',
    description: 'An assembly declared mates but the script returned arm.model() instead of arm.solvedModel({}), so mate FK never ran.',
  },
  // K1 watertight gap enrichment — STL export tessellation self-intersects on revolved cones.
  'mesher.cone-self-intersection': {
    hintTemplate:
      "Open3d's is_watertight() rejected the STL because OCCT's BRepMesh emits self-intersecting triangles on revolved cone faces (the K1 mesher gap). Geometry is likely correct — only the export tessellation is degenerate. Workarounds: (a) remesh the exported STL via Manifold before scoring, (b) raise mesh deflection on export to merge offending triangles, (c) re-author the cone surface via nurbsSurfaceLowerer instead of .revolve(). Track gap-closure progress under K1.",
    nextAction: { kind: 'rewrite-feature', guidance: 'remesh STL via Manifold, raise mesh deflection, or re-author the cone via nurbsSurfaceLowerer' },
    defaultSeverity: 'warn',
    group: 'mesher',
    description: 'BRepMesh emitted self-intersecting triangles on a revolved cone face, breaking watertight checks on the exported STL.',
  },
} as const satisfies Record<string, DiagnosticCodeSpec>;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_REGISTRY;

export const DIAGNOSTIC_CODES: readonly DiagnosticCode[] = Object.keys(
  DIAGNOSTIC_REGISTRY,
) as DiagnosticCode[];

export interface HintTemplate {
  /** Imperative one-sentence agent recovery instruction. */
  template: string;
  /** Structured form of the recovery instruction. Sibling to `template`. */
  nextAction: NextAction;
}

function buildHintTemplates(): Record<DiagnosticCode, HintTemplate> {
  const out = {} as Record<DiagnosticCode, HintTemplate>;
  for (const code of DIAGNOSTIC_CODES) {
    const spec = DIAGNOSTIC_REGISTRY[code];
    out[code] = { template: spec.hintTemplate, nextAction: spec.nextAction };
  }
  return out;
}

export const HINT_TEMPLATES: Record<DiagnosticCode, HintTemplate> = buildHintTemplates();

function buildNextActions(): Record<DiagnosticCode, NextAction> {
  const out = {} as Record<DiagnosticCode, NextAction>;
  for (const code of DIAGNOSTIC_CODES) {
    out[code] = DIAGNOSTIC_REGISTRY[code].nextAction;
  }
  return out;
}

export const NEXT_ACTIONS: Record<DiagnosticCode, NextAction> = buildNextActions();
