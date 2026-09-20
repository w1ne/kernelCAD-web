// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const FEATURE_CODES = {
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
  'feature.section.plane-misses-body': {
    hintTemplate:
      'The section plane does not intersect the body. Move the plane offset/origin so it passes through the solid, or check the normal direction.',
    nextAction: { kind: 'fix-arg', field: 'sectionSketch.plane' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A shape.sectionSketch / inspect section plane produced no closed section loop because it misses the body.',
  },
  'feature.face-sketch.non-planar': {
    hintTemplate:
      'The selected face is not planar, so it cannot be unrolled to a 2D sketch. Select a planar face (add { ofSurfaceType: "PLANE" } to the query) or use sectionSketch on a curved body.',
    nextAction: { kind: 'fix-arg', field: 'faceSketch.face' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A shape.faceSketch target face is non-planar or produced no closed boundary loops.',
  },
  'feature.async-result.missing-await': {
    hintTemplate:
      'This method returns a Promise — chain it directly on the awaited value, e.g. `(await shape.sectionSketch(...)).extrude(...)`.',
    nextAction: { kind: 'rewrite-feature', guidance: 'await the async Shape method (sectionSketch/faceSketch/silhouette) before chaining a Sketch method on its result' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A Sketch/Shape method was accessed directly on the unresolved Promise returned by an async producer (sectionSketch/faceSketch/silhouette) instead of on the awaited value.',
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
  'feature.emboss-text.boolean-noop': {
    hintTemplate:
      'The emboss/engrave boolean left the body unchanged — the glyph tool never intersected it. Check the anchor places the text over solid material (not over a hole or off the face) and that the depth sign matches the intent (positive = emboss out, negative = engrave in).',
    nextAction: { kind: 'fix-arg', field: 'anchorU' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'embossText boolean produced a result whose volume equals the parent volume; the feature had no effect.',
  },
  'feature.subtractive-noop': {
    hintTemplate:
      'A subtractive op (boolean difference, hole, or cutout) removed no material — the tool never intersected the body. Check the cutter/hole position overlaps the target solid, the depth reaches the material, and the operands are in the same coordinate frame.',
    nextAction: { kind: 'rewrite-feature', guidance: 'reposition or resize the cutting tool so it overlaps the target solid' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A boolean difference / hole / cutout produced a result whose volume equals the input volume; the cut had no effect.',
  },
  'feature.intersection-empty': {
    hintTemplate:
      'A boolean intersection produced an empty result — the two bodies do not overlap, so the requested common volume is empty. Check the operands share a region of space (same coordinate frame, overlapping positions) and that they intersect as a solid, not merely touch on a face or edge.',
    nextAction: { kind: 'rewrite-feature', guidance: 'reposition or resize the operands so their solids overlap before intersecting' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A boolean intersection produced an empty / zero-volume result; the operands do not share a common solid volume.',
  },
  'feature.empty-result': {
    hintTemplate:
      'A solid create (box, cylinder, sphere, extrude, revolve, loft, or sweep) produced an empty or zero-volume shape. Check the dimensions are positive and finite, the profile is a closed non-degenerate sketch, and the sweep/revolve path actually generates volume.',
    nextAction: { kind: 'rewrite-feature', guidance: 'give the create non-degenerate, positive dimensions or a valid closed profile so it produces a solid with volume' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A solid primitive or sweep-family create lowered to an empty or zero-volume shape; the result has no material.',
  },
  'feature.project-curve.no-intersection': {
    hintTemplate:
      'projectCurve could not intersect the source curve with the target face. For closed-curve mode, ensure the curve overlaps the face bounds. asEdge:true is not implemented — use closed-curve projection or pre-tessellate the open wire into a closed sketch.',
    nextAction: { kind: 'rewrite-feature', guidance: 'use closed-curve projection or shift the curve into the face bounds' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'projectCurve found no intersection between the supplied 2D curve and the target face, or the asEdge:true path was requested (not implemented).',
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
  // Draft (1) — Slice E Task 6/7
  'feature.draft.failed': {
    hintTemplate:
      'Draft failed on the selected face(s). Drafts need a planar neutral plane and a consistent pull direction; check that the face is planar and the angle is < 90°.',
    nextAction: { kind: 'fix-arg', field: 'face' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'BRepOffsetAPI_DraftAngle could not taper the requested faces.',
  },
  'feature.draft.neutral-plane-derived': {
    hintTemplate:
      'A named neutralPlane different from the drafted face is not yet honored; the parting plane was derived from the face geometry. Full named-neutral-plane support lands in a later slice.',
    nextAction: { kind: 'fix-arg', field: 'neutralPlane' },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'A draft was given a named neutralPlane distinct from the drafted face; the plane was derived from face geometry instead of the named plane.',
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
  // Finish (1) — named-finish front door over raw .material()
  'feature.finish.unknown-token': {
    hintTemplate:
      'Shape.finish() was called with a name that is not in the finish table. Pass one of the named finishes (metals: aluminium, anodized-black, brass, copper, …; plastics: abs, pla, delrin, …; glass: glass, glass-tinted, acrylic; paints: paint-matte, paint-gloss), or drop to .material({...}) for raw PBR.',
    nextAction: { kind: 'fix-arg', field: 'name' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'Shape.finish() received a finish name that the curated finish table does not define; the kernel rejects it rather than silently substituting a default.',
  },
} as const satisfies Record<`feature.${string}`, DiagnosticCodeSpec>;
