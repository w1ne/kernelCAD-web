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
  | 'mesher'
  | 'tool'
  | 'dfm';

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
  // W3 face authoring — emboss text + project curve (5)
  'feature.emboss-text.face-too-small': {
    hintTemplate:
      'The text block does not fit on the target face. Lower size, pick a larger face, or use scaleMode "bounds" so the glyphs are normalised to the face extent.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'size', factor: 0.5 },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'embossText: the rendered glyph block exceeds the target face bounds and cannot be wrapped.',
  },
  'feature.emboss-text.depth-zero': {
    hintTemplate:
      'embossText.depth must be non-zero. Use a positive value to emboss out of the face, a negative value to engrave into it.',
    nextAction: { kind: 'fix-arg', field: 'depth' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'embossText was called with depth === 0; no fuse or cut would change the geometry.',
  },
  'feature.project-curve.no-intersection': {
    hintTemplate:
      'projectCurve could not intersect the source curve with the target face. For closed-curve mode, ensure the curve overlaps the face bounds. asEdge:true is currently deferred — use closed-curve projection or pre-tessellate the open wire into a closed sketch.',
    nextAction: { kind: 'rewrite-feature', guidance: 'use closed-curve projection or shift the curve into the face bounds' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'projectCurve found no intersection between the supplied 2D curve and the target face, or the asEdge:true path is deferred.',
  },
  'feature.project-curve.curve-empty': {
    hintTemplate:
      'projectCurve received an empty curve source. Build the sketch via path().moveTo(...).lineTo(...).close() so the wire has at least one segment.',
    nextAction: { kind: 'fix-arg', field: 'source.commands' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'projectCurve.source.commands was empty so no projection could be built.',
  },
  'feature.face.invalid-uv-anchor': {
    hintTemplate:
      'UV anchors must lie in [0, 1] (0=umin/vmin, 0.5=face centre, 1=umax/vmax). Clamp the anchor or recompute against the face bounds.',
    nextAction: { kind: 'fix-arg', field: 'anchorU-or-anchorV' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A face-authoring feature received a UV anchor coordinate outside the [0, 1] parametric range.',
  },
  // Face-ref state (6)
  'feature.face-ref.not-resolvable': {
    hintTemplate:
      'The referenced face was not found on the current shape; lineage returned zero hits and the stored snapshot has no match within tolerance. Pick one of the nearest candidate refs printed in the message (or call list_faces to enumerate every face that still exists), or apply this feature before the upstream op that removed the original.',
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
      'The referenced face was split into multiple surviving lineage descendants by an upstream op. Pick one of the candidate refs printed in the message, or label the desired piece explicitly via faceLabels({...}) before the splitting op runs.',
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
  'feature.face-ref.snapshot-fallback-used': {
    hintTemplate:
      'Lineage returned no hits; the entity was recovered by geometry snapshot. The resolution is provisional — re-emit list_faces or list_edges and update the ref to the lineage-stable form before further edits move the entity beyond tolerance.',
    nextAction: { kind: 'rename', guidance: 'update the ref to the lineage-stable form via list_faces / list_edges' },
    defaultSeverity: 'info',
    group: 'feature',
    description: 'A topology ref resolved via the geometry-snapshot fallback because the lineage path returned zero hits.',
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
  'export.options-format-mismatch': {
    hintTemplate:
      'options.format must equal the top-level format. Set options.format to the same value, or omit options.',
    nextAction: { kind: 'fix-arg', field: 'options.format' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'The per-format options payload carried a discriminator that did not match the top-level format.',
  },
  'export.dxf.non-planar': {
    hintTemplate:
      'DXF export requires planar input. Call list_faces to pick a planar face, or return a Region via Shape.flattenPattern().',
    nextAction: { kind: 'call-introspection-tool', tool: 'list_faces' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A DXF export was attempted on non-planar geometry (3D solid without a single planar face source, or a multi-body Scene).',
  },
  'export.3mf.not-watertight': {
    hintTemplate:
      'The exported mesh has non-manifold edges (likely a self-intersecting cone tessellation or an open shell). Re-mesh via Manifold, raise OCCT mesh deflection, or re-author the offending surface via nurbsSurfaceLowerer; see the K1 mesher gap.',
    nextAction: { kind: 'rewrite-feature', guidance: 'remesh via Manifold, raise mesh deflection, or re-author the offending surface via nurbsSurfaceLowerer' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A 3MF export was attempted on a mesh that failed the half-edge watertight check.',
  },
  'export.glb.draco-glass-conflict': {
    hintTemplate:
      'Draco compression is reserved but not yet implemented. Pass options.draco: false or omit; the encoder ships in a follow-up slice. (The name nods at the most common collision: Draco encoders typically strip the `KHR_materials_transmission` extension on glass parts, which would silently break the GLB.)',
    nextAction: { kind: 'fix-arg', field: 'options.draco' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A GLB export requested Draco compression; the encoder is not yet implemented (reserved for a follow-up slice to avoid silently stripping KHR_materials_transmission on glass parts).',
  },
  'export.urdf.cylindrical-lossy': {
    hintTemplate:
      'URDF lacks a 2-DOF cylindrical joint; the mate was emitted as a single revolute and the prismatic DOF was dropped. Switch to format: \'sdf-gazebo\' if both DOFs are needed.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A cylindrical mate was lowered to a URDF revolute joint; the prismatic DOF was lost.',
  },
  'export.urdf.pin-slot-lossy': {
    hintTemplate:
      'URDF lacks a pin-slot joint; the mate was emitted as a single revolute and the slot translation DOF was dropped. Switch to format: \'sdf-gazebo\' or restructure the mate graph if both DOFs are needed.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A pin_slot mate was lowered to a URDF revolute joint; the slot translation DOF was lost.',
  },
  'export.urdf.ball-decomposed': {
    hintTemplate:
      'URDF lacks a spherical joint; the mate was decomposed into three chained revolute joints with two synthesised dummy intermediate links. Switch to format: \'sdf-gazebo\' for a native ball joint.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A ball mate was decomposed into a 3-revolute chain for URDF compatibility.',
  },
  'export.urdf.closed-loop': {
    hintTemplate:
      'URDF requires a tree topology (one parent per link); the assembly has a closed kinematic loop. Switch to export_model with format: \'sdf-gazebo\' which supports closed loops natively, or restructure the mate graph to a spanning tree.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'A URDF export was attempted on an assembly whose mate graph contains a closed kinematic loop.',
  },
  'export.urdf.inertia-density-declared': {
    hintTemplate:
      'Link inertia uses the default density 1000 kg/m^3 (water). Downstream dynamics simulations will be off by ~8x for steel or ~2.7x for aluminum unless you pass density on arm.part(name, shape, { density }).',
    nextAction: { kind: 'fix-arg', field: 'density' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A link in the exported URDF inherited the default 1000 kg/m^3 density; the user did not declare a per-part value.',
  },
  'export.srdf.acm-sparse-sampling': {
    hintTemplate:
      'ACM derivation used fewer than 4 samples per mate; interior collisions may be missed. Increase options.samplesPerMate on export_model({ format: \'srdf\', ... }) or set combinatorial: true.',
    nextAction: { kind: 'fix-arg', field: 'samplesPerMate' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'SRDF ACM auto-derivation ran with sparser sampling than the recommended threshold.',
  },
  'export.srdf.planning-group-missing': {
    hintTemplate:
      'SRDF export requires at least one arm.planningGroup(...) declaration before export. Declare arm.planningGroup(name, { chain: { baseLink, tipLink } }) or arm.planningGroup(name, { joints: [...] }) in your .kcad.ts.',
    nextAction: { kind: 'add-return' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'SRDF export attempted on an assembly with no planning-group declarations.',
  },
  'export.sdf-gazebo.cylindrical-lossy': {
    hintTemplate:
      'SDFormat lacks a 2-DOF cylindrical joint; the mate was emitted as a revolute and the prismatic DOF was dropped. Restructure the mate graph if both DOFs are required.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split cylindrical into a revolute + prismatic chain' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A cylindrical mate was lowered to an SDFormat revolute joint; the prismatic DOF was lost.',
  },
  'export.sdf-gazebo.pin-slot-lossy': {
    hintTemplate:
      'SDFormat lacks a pin-slot joint; the mate was emitted as a revolute and the slot translation DOF was dropped. Restructure the mate graph if both DOFs are required.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split pin_slot into a revolute + prismatic chain' },
    defaultSeverity: 'warn',
    group: 'export',
    description: 'A pin_slot mate was lowered to an SDFormat revolute joint; the slot translation DOF was lost.',
  },
  'export.sdf-gazebo.invalid-version': {
    hintTemplate:
      'SDFormat version attribute must be a recognised SDF spec version. The emitter writes <sdf version="1.12"> by default; do not override.',
    nextAction: { kind: 'fix-arg', field: 'version' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'The SDFormat emitter detected an unsupported version attribute.',
  },
  'export.sdf-gazebo.dangling-link-ref': {
    hintTemplate:
      'A <joint> in the emitted SDF references a <link> that is not declared in the model. Verify every part on the mate-graph is also declared via arm.part(...).',
    nextAction: { kind: 'call-introspection-tool', tool: 'inspect_robot' },
    defaultSeverity: 'error',
    group: 'export',
    description: 'SDFormat structural validation detected a joint referencing an undeclared link.',
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
  'feature.nurbs.bridge-conversion-failed': {
    hintTemplate:
      'nurbs.bridge: JS→kernel conversion failed (the kernel rejected the curve knot vector). Re-author with explicit knots the kernel accepts (non-decreasing; interior multiplicity <= degree+1; clamped ends multiplicity = degree+1). The default clamped-uniform knot vector always works.',
    nextAction: { kind: 'rewrite-feature', guidance: 'rebuild the curve with the default clamped-uniform knot vector or hand-author a monotonic knot sequence' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Bridge could not reconstruct a Geom_BSplineCurve from the analytics-side NURBS data; the kernel rejected the knot vector as ill-formed.',
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
  // Render environment (4) — W2 HDRI / IBL
  'feature.render-environment.conflicting-spec': {
    hintTemplate: 'setRenderEnvironment: pass either { preset } or { url }, not both.',
    nextAction: { kind: 'fix-arg', field: 'preset' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'setRenderEnvironment() received both a preset key and a custom url; only one may be provided.',
  },
  'feature.render-environment.missing-spec': {
    hintTemplate: "setRenderEnvironment: pass a preset key (e.g. 'studio') or a custom { url: '/hdri/...hdr' }.",
    nextAction: { kind: 'fix-arg', field: 'preset' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'setRenderEnvironment() was called with neither a preset key nor a custom url.',
  },
  'feature.render-environment.unknown-preset': {
    hintTemplate: "Valid presets: 'studio', 'softbox', 'neutral', 'outdoor', 'warehouse'.",
    nextAction: { kind: 'fix-arg', field: 'preset' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'setRenderEnvironment() was called with a preset key that is not one of the bundled keys.',
  },
  'feature.render-environment.intensity-out-of-range': {
    hintTemplate: 'setRenderEnvironment: intensity must be in (0, 100].',
    nextAction: { kind: 'fix-arg', field: 'intensity' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'setRenderEnvironment() received an intensity outside the (0, 100] range; the kernel clamped it to 1.',
  },
  // Camera target (2) — script-callable look-at override
  'feature.camera-target.non-finite-target': {
    hintTemplate: 'setCameraTarget: x, y, z must each be finite numbers (no NaN / Infinity).',
    nextAction: { kind: 'fix-arg', field: 'x' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'setCameraTarget() received a NaN or non-finite coordinate; the kernel substitutes 0 for the bad axis.',
  },
  'feature.camera-target.invalid-distance': {
    hintTemplate: 'setCameraTarget: distance must be a positive finite number; omit to use auto-fit.',
    nextAction: { kind: 'fix-arg', field: 'distance' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'setCameraTarget() received a non-positive or non-finite distance override; the kernel ignores the override and falls back to the auto-fit distance.',
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
  // Material — W1 extension (glass / anisotropy / textures)
  'feature.material.thickness-negative': {
    hintTemplate: 'Shape.material.thickness is in mm and must be non-negative. Use 0 for a thin shell or omit the field.',
    nextAction: { kind: 'fix-arg', field: 'thickness' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Shape.material() received a negative thickness value; the kernel rejects it because Three.MeshPhysicalMaterial.thickness must be non-negative.',
  },
  'feature.material.attenuation-distance-invalid': {
    hintTemplate: 'Shape.material.attenuationDistance must be positive finite mm, or Infinity for no attenuation. Use a positive distance like 10 (mm) for typical glass volumes.',
    nextAction: { kind: 'fix-arg', field: 'attenuationDistance' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Shape.material() received a non-positive or non-finite attenuationDistance.',
  },
  'feature.material.anisotropy-rotation-normalized': {
    hintTemplate: 'anisotropyRotation is in degrees and was normalized to [0, 360). Adjust your call to a value in that range to avoid the soft warning.',
    nextAction: { kind: 'fix-arg', field: 'anisotropyRotation' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'Shape.material() received an anisotropyRotation outside [0, 360); the kernel normalized the value into range.',
  },
  'feature.material.texture-not-found': {
    hintTemplate: 'Shape.material({ textures: { ...: { path } } }) referenced a path that the texture loader could not resolve. Check the path is correct (absolute, relative-to-script, or https URL) and the file exists.',
    nextAction: { kind: 'fix-arg', field: 'textures' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A TextureRef.path could not be resolved at load time.',
  },
  'feature.material.texture-unsupported-format': {
    hintTemplate: 'Supported texture formats are .png, .jpg, .jpeg, .webp. Convert the image to one of these and retry.',
    nextAction: { kind: 'fix-arg', field: 'textures' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A TextureRef.path used an extension outside the supported set (.png, .jpg, .jpeg, .webp).',
  },
  'feature.material.texture-oversize-warning': {
    hintTemplate: 'Texture dimensions exceed 2048 px on at least one axis; rendering still works but consider downscaling to keep GPU memory and load time bounded.',
    nextAction: { kind: 'fix-arg', field: 'textures' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'A texture image was loaded with a dimension greater than 2048 px; emitted as a soft warning.',
  },
  'feature.material.texture-oversize-error': {
    hintTemplate: 'Texture dimensions exceed 8192 px on at least one axis. Downscale the image (8K is the hard cap) and retry.',
    nextAction: { kind: 'fix-arg', field: 'textures' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A texture image was loaded with a dimension greater than 8192 px; the kernel rejects it as oversized.',
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
  // Assembly validator — v0.5 graph wiring (3)
  'assembly.part.floating': {
    hintTemplate:
      "Declare a joint or mate connecting this part to another part so the assembly graph is connected (arm.fixed/.revolute/.prismatic/.ball or arm.mate(...)).",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'declare an arm.fixed/.revolute/.prismatic/.ball joint or arm.mate(...) linking this part to another',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An assembly part has no joint or mate connecting it to any other part; the graph is disconnected.',
  },
  'assembly.part.orphan': {
    hintTemplate:
      "Add a joint or mate that links this sub-assembly to a part in the main mechanism so every component shares a single connected graph.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add a joint linking this sub-assembly to a part in the main mechanism',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A part is part of a sub-assembly that is not transitively reachable from the main connected component.',
  },
  'assembly.interference.overlap': {
    hintTemplate:
      "Translate one part along its mating direction, or add a coupling part (washer / spacer / bracket) to clear the overlap. Use --ignore '<a>,<b>' on `kernelcad interference` if the contact is intentional.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'translate one part or insert a spacer/bracket to remove the BREP overlap',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'Two solid parts in the assembly share BREP volume (their bodies interfere).',
  },
  // Assembly validator — v0.6 mate-graph solver (5)
  'assembly.part.under-constrained': {
    hintTemplate:
      "Add a mate (arm.mate('...', 'partA.connector', 'partB.connector', '<type>')) or tighten an existing mate so every part has its 6 DOF removed.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add or tighten a mate so every part has its 6 DOF removed',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'The mate graph leaves residual degrees of freedom; the assembly is under-constrained.',
  },
  'assembly.mate.over-constrained': {
    hintTemplate:
      "Remove or relax one of the mates in the closed loop, or adjust a connector origin so the geometry agrees with the other mates.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'remove or relax a mate in the closed loop, or adjust a connector origin',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'At least one mate in a closed loop contradicts the others (loop-closure residual exceeds tolerance).',
  },
  'assembly.mate.type-mismatch': {
    hintTemplate:
      "The connector types on the two sides of this mate are incompatible. Verify each connector's `type` is one of {frame, axis, plane} and matches what the mate expects.",
    nextAction: { kind: 'fix-arg', field: 'connectorType' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A mate references two connectors whose types are incompatible with the requested mate kind.',
  },
  'assembly.mate.connector-not-found': {
    hintTemplate:
      "The connector ref 'partName.connectorName' did not resolve. Verify the part exists, the connector name matches a registered connector on that part, and the part name is not misspelled.",
    nextAction: { kind: 'fix-arg', field: 'connectorRef' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A mate references a connector that does not exist on the named part.',
  },
  'assembly.loop.unclosed': {
    hintTemplate:
      "A closed kinematic loop did not close within tolerance. Verify the connector origins on the loop's mates are geometrically consistent, or relax one mate so the loop has the DOF to close.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'verify loop geometry or relax one mate so the loop can close',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A closed kinematic loop in the mate graph failed to close within tolerance.',
  },
  'assembly.solver.did-not-converge': {
    hintTemplate:
      "Articulated closed loops are not yet supported by the v0.6 solver. Restrict closed loops to fastened-only mates, or split the mechanism into two open kinematic chains.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'restrict closed loops to fastened-only mates or split into open chains',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'The mate solver did not converge within the iteration cap.',
  },
  // Assembly validator — v0.6.2 envelope (5)
  'assembly.pose.out-of-limits': {
    hintTemplate:
      "A pose-envelope sample was outside the mate's declared limits. Either tighten the sample distribution, or widen limitsDeg/limitsMm on the mate to match the intended travel.",
    nextAction: { kind: 'fix-arg', field: 'limitsDeg' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A pose-envelope sample violates the mate-scalar limits declared on the mate.',
  },
  'assembly.pose-envelope.solve-failed': {
    hintTemplate:
      "The mate solver failed on a sampled pose inside the envelope. Verify the mate graph is consistent at that pose, then re-run; if it persists, simplify the mechanism or restrict limits to the converging range.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'simplify the mechanism or restrict mate limits to the converging range',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'The mate solver failed to converge for a sampled pose inside the declared envelope.',
  },
  'assembly.pose-envelope.interference': {
    hintTemplate:
      "Parts overlap somewhere inside the declared travel range. Either narrow mate limits to avoid the colliding poses, or revise part geometry / connector origins so the mechanism stays self-clear across the full envelope.",
    nextAction: { kind: 'fix-arg', field: 'limitsDeg' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'Two parts interfere at one or more sampled poses inside the declared envelope.',
  },
  'assembly.pose-envelope.connector-unresolved': {
    hintTemplate:
      "A tracked connector ref could not be resolved at a sampled pose — usually a topology-bound origin the envelope sampler does not yet support. Use { kind: 'vec3', value: [x, y, z] } for the connector origin.",
    nextAction: { kind: 'fix-arg', field: 'connectorRef' },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A connector ref tracked by the pose envelope could not be resolved at a sampled pose.',
  },
  'assembly.gripper-aperture.connector-missing': {
    hintTemplate:
      "Gripper-aperture tracking expects two named connector refs on the gripper jaws. Pass { aRef: 'jaw_a.tip', bRef: 'jaw_b.tip' } (or whatever the connector names are) to gripperAperture.",
    nextAction: { kind: 'fix-arg', field: 'gripperAperture' },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A gripper-aperture request named a connector that does not exist on either jaw.',
  },
  // Assembly validator — v0.6.2 limit-missing warning (1)
  'assembly.mate.limit-missing': {
    hintTemplate:
      "Declare limitsDeg:[min,max] (or limitsMm for prismatic) on this mate so the kernel can verify the mechanism does not self-collide across its declared range.",
    nextAction: { kind: 'fix-arg', field: 'limitsDeg' },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An articulated mate (revolute/prismatic/cylindrical/pin_slot) has no declared limits; envelope review cannot verify its travel range.',
  },
  // Assembly validator — v0.7 kinematic-grounding gates (3)
  'assembly.mounting-hole.mismatch': {
    hintTemplate:
      "Make the hole features on the two bound faces compatible: same kind (clearance ↔ threaded), same nominal diameter, same depth. Use list_face_labels to inspect available holes.",
    nextAction: { kind: 'fix-arg', field: 'holeFeatures' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A fastened mate binds two faces whose hole features are incompatible (kind/diameter/depth mismatch).',
  },
  'assembly.joint-axis.unbound': {
    hintTemplate:
      "Move the connector origin onto a face/edge of its part, or change the connector axis so the line passes through the part's body.",
    nextAction: { kind: 'fix-arg', field: 'connectorOrigin' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A joint axis (mate connector origin + direction) does not intersect the part body it claims to act on.',
  },
  'assembly.joint.load-exceeded': {
    hintTemplate:
      "Increase maxLoad on this joint, reduce externalLoads, or split the load path with an additional joint.",
    nextAction: { kind: 'fix-arg', field: 'maxLoad' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A joint declared a maxLoad that is exceeded by the applied externalLoads.',
  },
  // Assembly validator — v0.7 Slice 1 workspace reachability (1)
  'assembly.workspace.unreachable': {
    hintTemplate:
      "Widen mate limits so the envelope reaches the target, revise the target, or run the envelope (validate:'error', posesGate:'envelope') if the gate hasn't been sampled yet.",
    nextAction: { kind: 'fix-arg', field: 'reachable' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A declared workspace target lies outside the sampled connector-workspace AABB (minus tolerance).',
  },
  // Assembly connector — topology resolution (1)
  'assembly.connector.topology-not-resolvable': {
    hintTemplate:
      "Use a face-center, face-normal, or edge-axis topology query whose target exists on the connector's parent shape; switch to { kind: 'vec3', value: [x, y, z] } if a topology binding isn't required.",
    nextAction: { kind: 'fix-arg', field: 'topology' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A connector topology query (face/edge/vertex) did not resolve against the connector parent shape.',
  },
  // Assembly mechanical-plausibility checks (6)
  'assembly.mechanical.part-disconnected': {
    hintTemplate:
      "Remove decorative/floating solids from this part, or add real bridge/bracket geometry so every solid in the part shares a physical load path.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'merge or bridge the floating solids in this part so it has one continuous load path',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A part contains multiple disconnected mesh components separated by more than the connectivity tolerance.',
  },
  'assembly.mechanical.connector-not-in-solid': {
    hintTemplate:
      "Move this connector onto the part's modeled bearing/bracket/knuckle, or add support geometry around that connector so the mate has a physical load path.",
    nextAction: { kind: 'fix-arg', field: 'connectorOrigin' },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A mate connector origin lies outside its part\'s modeled material by more than the support tolerance.',
  },
  'assembly.mechanical.mate-contact-missing': {
    hintTemplate:
      "Add a bracket, flange, horn, or mounting face so the two fastened parts share a real contact patch near the mate, not just a connector point.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add a bracket/flange/mounting face so the fastened parts share a real contact patch',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A fastened mate joins two parts whose modeled bodies do not share a usable contact area.',
  },
  'assembly.mechanical.fixed-contact-missing': {
    hintTemplate:
      "Move the fixed child into contact with its parent, or add a bracket, flange, stem, bridge, or mounting face so the fixed joint represents real attached geometry instead of an air gap.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'move or bridge fixed-joint parts so parent and child share a real contact patch',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A legacy assembly.fixed() joint joins two parts whose modeled bodies do not share a usable contact area.',
  },
  'assembly.mechanical.revolute-unsupported': {
    hintTemplate:
      "Add a hinge knuckle, bearing block, bracket, or shaft support so this connector lies on modeled material, not just near a bounding box.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add a hinge knuckle / bearing block / bracket so the revolute connector lies on modeled material',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A revolute mate connector origin is outside the modeled support material of its part.',
  },
  'assembly.mechanical.revolute-contact-missing': {
    hintTemplate:
      "Add interleaved hinge knuckles, a clevis tab, spacer, or bearing shoulder so the two parts have modeled support faces near each other along the hinge axis.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add interleaved hinge knuckles / clevis tab / bearing shoulder along the hinge axis',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A revolute mate leaves an axial gap between the two parts\' modeled bearing material.',
  },
  // Assembly transmission — orphan codes referenced in skill MD (2)
  'assembly.transmission.missing-for-coupled-mate': {
    hintTemplate:
      "Add arm.transmission(name, { sourceMate, drivenMates: [...], kind, path: [...] }) naming the horn/link/gear/belt/tendon parts that transfer motion between the coupled mates.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'declare arm.transmission(...) naming the physical drive path between the coupled mates',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A coupled mate pair lacks a declared arm.transmission(...) describing the physical drive path.',
  },
  'assembly.transmission.path-disconnected': {
    hintTemplate:
      "Add a horn/link/gear/belt/tendon part that physically touches both adjacent parts across the declared travel, or reorder the transmission path so consecutive parts form a continuous load path.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add or reorder transmission-path parts so consecutive parts touch within tolerance',
    },
    defaultSeverity: 'error',
    group: 'assembly',
    description: 'A transmission path has a gap between consecutive parts that exceeds the contact tolerance at some sampled pose.',
  },
  // Assembly visual-review gating (3)
  'assembly.visual.review-check-failed': {
    hintTemplate:
      "Repair the specific failed visual checks, render screenshots again, and only accept when every required check passes.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'repair the failed visual checks and re-render before accepting',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'A required visual-review check failed (or remained failed inside an accepted review).',
  },
  'assembly.visual.review-evidence-weak': {
    hintTemplate:
      "Record concrete screenshot evidence — name interfaces, load paths, seated hardware, dial legibility, casing layers — before accepting the attempt.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'record concrete screenshot evidence (interfaces, load paths, legibility) before accepting',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An accepted visual review has check findings without concrete evidence (interfaces, load paths, legibility, casing layers).',
  },
  'assembly.visual.review-incomplete': {
    hintTemplate:
      "Render or open screenshots, inspect them against the required visualReview.checks checklist, and record screenshotPath plus concrete findings before accepting.",
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'render screenshots and record screenshotPath + findings + checks before accepting',
    },
    defaultSeverity: 'warn',
    group: 'assembly',
    description: 'An accepted visual review is missing screenshotPath, findings, or required check coverage.',
  },
  // NURBS Slice B (5) — Curve3D / nurbsCurve capture-time validation.
  'feature.curve3d.degenerate-controls': {
    hintTemplate:
      'nurbsCurve needs at least degree+1 control points. Add more control points or reduce the degree.',
    nextAction: { kind: 'fix-arg', field: 'controlPoints' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve received fewer than degree+1 control points.',
  },
  'feature.curve3d.weights-length-mismatch': {
    hintTemplate:
      'nurbsCurve weights array must match controlPoints length. Pass one weight per control point.',
    nextAction: { kind: 'fix-arg', field: 'weights' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve weights array length does not match controlPoints length.',
  },
  'feature.curve3d.weights-non-positive': {
    hintTemplate:
      'nurbsCurve weights must all be strictly positive (zero collapses the basis; negative is undefined for B-splines).',
    nextAction: { kind: 'fix-arg', field: 'weights' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve weights array contains zero or negative values.',
  },
  'feature.curve3d.knots-length-mismatch': {
    hintTemplate:
      'nurbsCurve knot vector length must equal controlPoints.length + degree + 1.',
    nextAction: { kind: 'fix-arg', field: 'knots' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'nurbsCurve knot vector length is not controlPoints.length + degree + 1.',
  },
  'feature.curve3d.closed-endpoints-mismatch': {
    hintTemplate:
      'nurbsCurve closed=true but first and last control points differ; OCCT will close internally but the user-visible control net is misleading. Match the endpoints or drop closed.',
    nextAction: { kind: 'fix-arg', field: 'controlPoints' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'nurbsCurve was authored with closed=true but the first and last control points are not coincident.',
  },
  // NURBS Slice B — variableSweep PipeShell validation.
  'feature.variable-sweep.sections-out-of-order': {
    hintTemplate:
      'variableSweep sections must be strictly increasing in t. Sort sections by t ascending.',
    nextAction: { kind: 'fix-arg', field: 'sections' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep received sections whose t values are not strictly increasing.',
  },
  'feature.variable-sweep.sections-not-spanning': {
    hintTemplate:
      'variableSweep sections must span the full spine: first section at t=0 and last section at t=1 are required.',
    nextAction: { kind: 'fix-arg', field: 'sections' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep sections do not include t=0 or t=1.',
  },
  'feature.variable-sweep.spine-too-short': {
    hintTemplate:
      'variableSweep spine is shorter than the smallest profile bounding diameter, so the sweep would self-intersect. Lengthen the spine or shrink the profiles.',
    nextAction: { kind: 'fix-arg', field: 'spine' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep spine length is below the smallest profile bounding diameter.',
  },
  'feature.variable-sweep.profile-not-planar': {
    hintTemplate:
      'variableSweep profiles must be planar sketches. Use a 2D path()/close() chain (or surfaceFromBoundary for non-planar sections in a later slice).',
    nextAction: { kind: 'rewrite-feature', guidance: 'use a planar path().close() sketch for each section' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep received a non-planar profile sketch.',
  },
  'feature.variable-sweep.profile-empty': {
    hintTemplate:
      'variableSweep profile sketch is empty. Close the path() before passing it as a profile.',
    nextAction: { kind: 'rewrite-feature', guidance: 'close the path() before passing as a profile' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep received an empty/unclosed profile sketch.',
  },
  'feature.variable-sweep.frenet-degenerate': {
    hintTemplate:
      'Frenet orientation is undefined where the spine curvature vanishes (straight segments). Pass orientation: { up: Vec3 } or "corrected-frenet" for spines with straight stretches.',
    nextAction: { kind: 'fix-arg', field: 'orientation' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'variableSweep with Frenet orientation hit a zero-curvature span on the spine.',
  },
  // NURBS Slice C (6) — surfaceFromBoundary (Coons patch) + G2 fillet.
  'feature.surface-from-boundary.corner-mismatch': {
    hintTemplate:
      'surfaceFromBoundary requires adjacent boundary curves to share endpoints within 1e-6 mm (c1.end == c2.start, c2.end == c3.start, c3.end == c4.start, c4.end == c1.start). Snap the endpoints or rebuild the boundary curves so they form a closed loop.',
    nextAction: { kind: 'fix-arg', field: 'curveRefs' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary boundary curves do not share corner endpoints within tolerance.',
  },
  'feature.surface-from-boundary.too-few-curves': {
    hintTemplate:
      'surfaceFromBoundary requires exactly 4 boundary curves. Pass an array of 4 Curve3D refs in walk order (bottom, right, top, left).',
    nextAction: { kind: 'fix-arg', field: 'curveRefs' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary received fewer than 4 boundary curves.',
  },
  'feature.surface-from-boundary.too-many-curves': {
    hintTemplate:
      'surfaceFromBoundary requires exactly 4 boundary curves. Pass an array of 4 Curve3D refs in walk order — if the loop has more than 4 sides, split the patch into adjacent quads.',
    nextAction: { kind: 'fix-arg', field: 'curveRefs' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary received more than 4 boundary curves.',
  },
  'feature.surface-from-boundary.continuity-orphan': {
    hintTemplate:
      "surfaceFromBoundary continuity 'C1' / 'C2' requires the neighbors map to identify which existing surface to be tangent (or curvature-continuous) to on each side. Either drop the continuity flag or supply opts.neighbors so the kernel can resolve the tangency target.",
    nextAction: { kind: 'fix-arg', field: 'neighbors' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'surfaceFromBoundary requested C1/C2 continuity without a neighbors map identifying the tangency target.',
  },
  'feature.surface-from-boundary.degenerate-patch': {
    hintTemplate:
      'BRepOffsetAPI_MakeFilling could not produce a face. The boundary curves are likely coincident, self-intersecting, or topologically invalid. Inspect the curve sequence with list_features and visualize each Curve3D before retrying.',
    nextAction: { kind: 'rewrite-feature', guidance: 'rebuild the 4 boundary curves so they form a non-self-intersecting closed loop, then retry surfaceFromBoundary' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'BRepOffsetAPI_MakeFilling returned no face for the supplied boundary curves.',
  },
  'feature.fillet.continuity-not-applicable': {
    hintTemplate:
      "continuity: 'G2' was requested but the adjacent faces along the target edge are themselves only G1-continuous, so the resulting blend can be no smoother than G1. Either accept the G1 result, refit the upstream faces as NURBS so they are G2 internally, or apply a smaller fillet that fits inside a single smooth region.",
    nextAction: { kind: 'rewrite-feature', guidance: "drop continuity: 'G2' (adjacent faces are only G1) or refit the upstream faces as NURBS surfaces" },
    defaultSeverity: 'warn',
    group: 'feature',
    description: "fillet requested G2 continuity but adjacent faces are only G1.",
  },
  // NURBS Slice C — hermiteG2 quintic transition curve (pure-JS solver).
  'feature.hermite-g2.degenerate-tangent': {
    hintTemplate:
      'hermiteG2 received a tangent with zero magnitude on one or both endpoints. The quintic Hermite scales the tangent into the inner control points; a zero tangent collapses two control points onto the endpoint, producing a cusp rather than a smooth transition. Supply a non-zero tangent (magnitude in the order of the chord length between the endpoints).',
    nextAction: { kind: 'fix-arg', field: 'tangent' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'hermiteG2 received a zero-magnitude tangent on one or both endpoints.',
  },
  'feature.hermite-g2.non-finite-input': {
    hintTemplate:
      'hermiteG2 received NaN / Infinity in one of point, tangent, or curvature. Validate the endpoints upstream — typically caused by a divide-by-zero in a normal/curvature derivation. Recompute the endpoint with finite inputs before retrying.',
    nextAction: { kind: 'fix-arg', field: 'see-message' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'hermiteG2 received NaN or Infinity in an endpoint argument.',
  },
  // NURBS Slice D (4) — 2D path NURBS authoring (PathBuilder .spline / .nurbsSegment / .hermiteG2).
  'feature.path.spline.degenerate-points': {
    hintTemplate:
      'path().spline expects at least 2 distinct finite Vec2 waypoints; the curve interpolates through every one. Remove duplicate consecutive points (closer than 1e-9 mm), replace any NaN / Infinity coords with finite values, and ensure the array has length >= 2.',
    nextAction: { kind: 'fix-arg', field: 'points' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'path().spline received fewer than 2 distinct finite waypoints.',
  },
  'feature.path.nurbs-segment.degenerate-controls': {
    hintTemplate:
      'path().nurbsSegment expects at least degree+1 finite Vec2 control points, with the first control point matching the current pen position within 1e-6 mm. Add more control points or reduce the degree, and align controlPoints[0] with the current position (or call moveTo first).',
    nextAction: { kind: 'fix-arg', field: 'controlPoints' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'path().nurbsSegment received fewer than degree+1 finite control points or the first control did not match the pen position.',
  },
  'feature.path.nurbs-segment.weights-non-positive': {
    hintTemplate:
      'path().nurbsSegment weights must all be strictly positive (zero collapses the basis; negative is undefined for B-splines). Replace any zero / negative weight with a positive value, and ensure the array length matches controlPoints.',
    nextAction: { kind: 'fix-arg', field: 'weights' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'path().nurbsSegment weights contain zero or negative values, or length does not match controlPoints.',
  },
  'feature.path.hermite-g2.start-mismatch': {
    hintTemplate:
      "path().hermiteG2 requires `a.point` to match the path's current pen position within 1e-6 mm. Either align a.point with the prior segment's endpoint, or call moveTo(a.point.x, a.point.y) before hermiteG2.",
    nextAction: { kind: 'fix-arg', field: 'a.point' },
    defaultSeverity: 'error',
    group: 'feature',
    description: "path().hermiteG2 received `a.point` not matching the current pen position within tolerance.",
  },
  // W4 §3 — trace_from_image MCP tool diagnostics (5).
  'tool.trace-from-image.invalid-image-url': {
    hintTemplate:
      "Pass a non-empty `imageUrl` — a file:// path, http(s):// URL, data:image/...;base64,... URI, or a bare filesystem path.",
    nextAction: { kind: 'fix-arg', field: 'imageUrl' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'trace_from_image was called with a missing, empty, or otherwise unparseable imageUrl.',
  },
  'tool.trace-from-image.no-features-requested': {
    hintTemplate:
      "Pass at least one feature in `features`, or omit the `features` field to fall back to the default silhouette request.",
    nextAction: { kind: 'fix-arg', field: 'features' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'trace_from_image was called with an explicitly empty features array.',
  },
  'tool.trace-from-image.image-fetch-failed': {
    hintTemplate:
      "Verify the imageUrl resolves to a readable PNG/JPEG/WebP/GIF — check the path/URL, the file's existence, and network access for http(s) URLs.",
    nextAction: { kind: 'check-file-path' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'trace_from_image could not fetch or decode the image at the supplied URL.',
  },
  'tool.trace-from-image.backend-failed': {
    hintTemplate:
      "The selected backend threw while extracting features. Re-call with a different `backend` (e.g. `vision-llm` if `opencv` failed on a cluttered photo), tighten `region` on the requested features, or inspect the diagnostic message for the underlying error.",
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'The trace_from_image backend (opencv / vision-llm / hybrid) threw while extracting features.',
  },
  'tool.trace-from-image.opencv-cannot-label': {
    hintTemplate:
      "opencv only extracts a single silhouette — it cannot label point/bbox features. Either drop the point/bbox features, or switch backend to `hybrid` so the LLM labels them on top of the opencv silhouette.",
    nextAction: { kind: 'fix-arg', field: 'backend' },
    defaultSeverity: 'warn',
    group: 'tool',
    description: 'A point/bbox feature was requested but the opencv backend was forced, so only the silhouette polyline could be returned.',
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
  // DFM preflight (23) — Slice E
  'dfm.input.vendor-required': {
    hintTemplate:
      'dfm_preflight requires a vendor identifier. Pass `vendor: "sendcutsend"` (or another supported vendor SKU listed in catalogs/sources-manifest.json).',
    nextAction: { kind: 'fix-arg', field: 'vendor' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'dfm_preflight was called without a vendor identifier; the tool fails closed rather than guess.',
  },
  'dfm.input.material-required': {
    hintTemplate:
      'dfm_preflight requires a material SKU. Pass `material: "<sku>"` (use list_part_categories or the vendor catalog.json to enumerate the supported SKUs).',
    nextAction: { kind: 'fix-arg', field: 'material' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'dfm_preflight was called without a material SKU; the tool fails closed rather than guess.',
  },
  'dfm.input.thickness-required': {
    hintTemplate:
      'dfm_preflight requires a thickness. Pass `thicknessIn: <inches>` or `thicknessMm: <mm>`; pick a value from catalog[sku].thicknessesIn.',
    nextAction: { kind: 'fix-arg', field: 'thicknessMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'dfm_preflight was called without a thickness; the tool fails closed rather than guess.',
  },
  'dfm.units.dxf-not-mm': {
    hintTemplate:
      'DXF $INSUNITS header must be 4 (mm). Re-export from kernelCAD with the default unit, or pass `unit: "mm"` to export_model.',
    nextAction: { kind: 'fix-arg', field: 'unit' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A DXF input declared $INSUNITS != 4 (mm); preflight refuses to rescale silently.',
  },
  'dfm.material.unknown-sku': {
    hintTemplate:
      'Material SKU is not present in the vendor catalog. Pick one from catalogs/vendors/<vendor>/catalog.json, or run `npm run shopcheck:refresh` if the vendor recently added it.',
    nextAction: { kind: 'fix-arg', field: 'material' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Material SKU passed to dfm_preflight does not match any entry in the vendor catalog.',
  },
  'dfm.thickness.not-stocked': {
    hintTemplate:
      'Thickness is not one of the vendor-stocked gauges for this material. Pick a value from catalog[sku].thicknessesIn.',
    nextAction: { kind: 'fix-arg', field: 'thicknessMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Thickness passed to dfm_preflight is not in the vendor catalog's stocked-gauges list for the selected material.",
  },
  'dfm.thickness.out-of-range': {
    hintTemplate:
      'Thickness is outside the vendor service envelope (e.g. laser cutting). Pick a thickness inside the published min/max for this service.',
    nextAction: { kind: 'fix-arg', field: 'thicknessMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Thickness exceeds the vendor service's overall thickness envelope (e.g. laser cutting 0.015–0.750 in).",
  },
  'dfm.thickness.out-of-range-for-service': {
    hintTemplate:
      'Thickness is inside the laser envelope but outside the bending envelope. Either drop the bend (laser-only is fine), pick a thinner material for bending, or split into parts joined post-bend.',
    nextAction: { kind: 'fix-arg', field: 'service' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Thickness exceeds the vendor service-specific envelope (e.g. bending's 0.030–0.250 in band).",
  },
  'dfm.hole.below-minimum': {
    hintTemplate:
      'Hole diameter is below the vendor minimum for this material + thickness. Enlarge the hole to >= the published minimum, remove the hole, or switch to a thinner material.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'thicknessMm', factor: 0.5 },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A hole diameter is below the vendor minimum hole rule for the selected material and thickness.',
  },
  'dfm.slot.below-minimum': {
    hintTemplate:
      'Slot width is below the vendor minimum for this material + thickness. Widen the slot or split into multiple slots.',
    nextAction: { kind: 'fix-arg', field: 'slot.width' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A slot width is below the vendor minimum slot rule for the selected material and thickness.',
  },
  'dfm.web.below-minimum': {
    hintTemplate:
      'Bridge / web width between two cutouts is below the vendor minimum. Increase the bridge width, merge the cutouts, or relocate one.',
    nextAction: { kind: 'fix-arg', field: 'web' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'The minimum bridge (web) width between cutouts is below the vendor minimum web rule for the selected material and thickness.',
  },
  'dfm.bend.radius-below-minimum': {
    hintTemplate:
      'Inner bend radius is below the vendor minimum for this material + thickness. Increase the radius arg in .bend(edge, angle, radius), or pick a thicker material.',
    nextAction: { kind: 'fix-arg', field: 'radius' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A sheetMetal inner bend radius is below the vendor minimum bend-radius rule for the selected material and thickness.',
  },
  'dfm.bend.angle-too-acute': {
    hintTemplate:
      'Bend angle exceeds the vendor maximum (typically |angle| <= 130 deg for sheet metal). Reduce the angle in .bend(edge, angle, radius).',
    nextAction: { kind: 'fix-arg', field: 'angle' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A bend angle is steeper than the vendor maximum acute-angle rule.',
  },
  'dfm.bend.length-exceeds-max': {
    hintTemplate:
      'Bend line is longer than the vendor maximum (typically 44 in / 1117 mm). Split the part along the bend axis, or accept the warning and request a custom quote.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split the part along the bend axis to keep each segment under the vendor max bend length' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Bend line length exceeds the vendor maximum bend length.',
  },
  'dfm.bend.flange-too-short': {
    hintTemplate:
      'Flange length on one side of the bend is below the vendor minimum. Lengthen the over-short side, or pick a thinner material so the minimum is reduced.',
    nextAction: { kind: 'fix-arg', field: 'flangeLength' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A flange (before- or after-bend) is shorter than the vendor minimum flange rule for the selected material and thickness.',
  },
  'dfm.bend.channel-ratio-too-low': {
    hintTemplate:
      'Channel base length is shorter than 2x the flange (3x for polycarbonate). Lengthen the channel base, or shorten the flanges.',
    nextAction: { kind: 'fix-arg', field: 'channelBase' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Channel base-to-flange ratio is below the vendor minimum for the selected material.',
  },
  'dfm.bend.layer-missing': {
    hintTemplate:
      'DXF input has bend metadata in the source but no BEND layer in the DXF. Re-export with export_model({ format: "dxf" }); the writer auto-emits the BEND layer.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'DXF input is missing the BEND layer; preflight cannot validate bend rules.',
  },
  'dfm.bending.material-unsupported': {
    hintTemplate:
      "Material is not on the vendor's bend-supported list. Switch material, or split into laser-only flat parts joined post-bend by the customer.",
    nextAction: { kind: 'fix-arg', field: 'material' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Material is not on the vendor's bend-supported list but the input has bend metadata.",
  },
  'dfm.size.below-minimum': {
    hintTemplate:
      'Part bounding box is below the vendor minimum part size. Enlarge the part, or switch to a vendor with smaller min-size limits.',
    nextAction: { kind: 'fix-arg', field: 'partAabb' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Part bounding box is below the vendor minimum part size for the selected material category.',
  },
  'dfm.size.exceeds-instant-quote': {
    hintTemplate:
      'Part bounding box exceeds the vendor instant-quote envelope (typically 44 x 30 in). Part may need a custom quote — split it, or accept the warning.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split the part to fit within the vendor instant-quote envelope' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Part bounding box exceeds the vendor instant-quote envelope.',
  },
  'dfm.size.exceeds-max': {
    hintTemplate:
      'Part bounding box exceeds the vendor maximum part size. Split the part, or pick a vendor with larger stock.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split the part to fit within the vendor maximum stock size' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Part bounding box exceeds the vendor maximum part size.',
  },
  'dfm.dxf.spline-present': {
    hintTemplate:
      'DXF contains SPLINE entities on the cut layer. Re-export from kernelCAD (export_model emits LWPOLYLINE only).',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'DXF contains SPLINE entities; the vendor only accepts LWPOLYLINE.',
  },
  'dfm.dxf.tessellation-near-tolerance': {
    hintTemplate:
      'A tessellated polyline segment is at or below the DXF tessellation tolerance (0.1 mm). Widen the feature, or re-export the DXF with a finer tessellation tolerance.',
    nextAction: { kind: 'fix-arg', field: 'tolerance' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A polyline segment in the DXF is at or below the DXF tessellation tolerance, risking measurement disagreement at the vendor importer.',
  },
  'dfm.rule.threshold-unknown': {
    hintTemplate:
      'Vendor does not publish a threshold for this rule and material. Verify the feature manually with the vendor before ordering, or pick a material the vendor publishes a value for.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A rule\'s per-material threshold is null in specs.json because the vendor does not publish the value.',
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
