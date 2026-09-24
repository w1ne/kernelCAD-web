// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Single source of truth for the kernelCAD agent-facing diagnostic
// vocabulary. Every entry corresponds to a distinct recovery action an
// agent would take. See spec 2026-05-05-diagnostic-vocabulary-milestone-c.
//
// Add a new code only when no existing code corresponds to its recovery.
// Removing or renaming any code is a breaking change to the agent contract.
//
// The registry is split per domain group under this directory
// (docs/plans/2026-09-17-quality-slice-5-diagnostics-registry.md). To add a
// code: add its entry to the matching `registry/<group>.ts` file only. This
// file spreads every group file into DIAGNOSTIC_REGISTRY and re-derives all
// four agent-facing views (DiagnosticCode union, DIAGNOSTIC_CODES
// array, HINT_TEMPLATES, NEXT_ACTIONS) from it automatically — a new code
// does not need a second edit here. See the LEGACY_CODE_ORDER comment below
// for how ordering works and tests/unit/diagnostics/registryProjectionSnapshot.test.ts
// for what is and isn't locked.

import type { NextAction } from '../nextAction';
import type { DiagnosticCodeSpec } from './types';

import { FEATURE_CODES } from './feature';
import { FEATURE_DIRECT_EDIT_CODES } from './featureDirectEdit';
import { SKETCH_CODES } from './sketch';
import { RECOMPUTE_CODES } from './recompute';
import { CLI_CODES } from './cli';
import { EXPORT_CODES } from './export';
import { FEATURE_SURFACES_CODES } from './featureSurfaces';
import { ASSEMBLY_CODES } from './assembly';
import { MECHANISM_CODES } from './mechanism';
import { TOOL_CODES } from './tool';
import { MESHER_CODES } from './mesher';
import { PARTS_CODES } from './parts';
import { DFM_CODES } from './dfm';
import { KINEMATIC_CODES } from './kinematic';
import { QUERY_CODES } from './query';
import { ANIMATION_CODES } from './animation';
import { DRAWING_CODES } from './drawing';
import { REFERENCE_CODES } from './reference';
import { FEA_CODES } from './fea';
import { DIFF_CODES } from './diff';
import { BOM_CODES } from './bom';
import { RENDER_CODES } from './render';
import { INSPECT_CODES } from './inspect';

export type { DiagnosticGroup, DiagnosticSeverityLevel, DiagnosticCodeSpec } from './types';

export const DIAGNOSTIC_REGISTRY = {
  ...FEATURE_CODES,
  ...FEATURE_DIRECT_EDIT_CODES,
  ...SKETCH_CODES,
  ...RECOMPUTE_CODES,
  ...CLI_CODES,
  ...EXPORT_CODES,
  ...FEATURE_SURFACES_CODES,
  ...ASSEMBLY_CODES,
  ...MECHANISM_CODES,
  ...TOOL_CODES,
  ...MESHER_CODES,
  ...PARTS_CODES,
  ...DFM_CODES,
  ...KINEMATIC_CODES,
  ...QUERY_CODES,
  ...ANIMATION_CODES,
  ...DRAWING_CODES,
  ...REFERENCE_CODES,
  ...FEA_CODES,
  ...DIFF_CODES,
  ...BOM_CODES,
  ...RENDER_CODES,
  ...INSPECT_CODES,
} as const satisfies Record<string, DiagnosticCodeSpec>;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_REGISTRY;

// Grouping the registry per file (above) does not reproduce the original
// single-file key order: the pre-split sequence is 29 runs over the 21
// domain prefixes (not one contiguous run per prefix), and under this
// branch's 23-file split it is 33 runs, with `feature`/`featureSurfaces`
// each occupying 4 non-contiguous runs and `export`/`assembly`/`tool`/
// `drawing` each 2. Reproducing the order by spread order alone would need
// positional shard files (e.g. two `tool` files with no domain meaning),
// which defeats "registry per domain" — so the original order is frozen
// here as a literal instead. It is the kernelCAD agent-facing contract:
// DIAGNOSTIC_CODES, HINT_TEMPLATES, NEXT_ACTIONS all derive their order
// from it. Never edit or reorder this array by hand; it is the published
// order of the 309 codes that existed before the split. A code added to a
// group file does NOT need an entry here — DIAGNOSTIC_CODES below appends
// any registry code missing from this anchor, in registry-spread order, so
// new codes land in all four projections automatically. The `satisfies`
// clause makes a typo'd or removed code a compile error naming the
// offender; the duplicate check further down throws at module load if a
// code is listed here twice. See
// tests/unit/diagnostics/registryProjectionSnapshot.test.ts for what is
// locked (the first 309 positions) and what isn't (codes appended after).
const LEGACY_CODE_ORDER = [
  'feature.invalid-args',
  'feature.direct-edit.clamped',
  'feature.direct-edit.delta-wrapper',
  'feature.direct-edit.unresolved',
  'feature.direct-edit.shared-param-conflict',
  'feature.kernel-failed',
  'feature.revolve.crosses-axis',
  'feature.sketch.degenerate-arc',
  'feature.section.plane-misses-body',
  'feature.face-sketch.non-planar',
  'feature.async-result.missing-await',
  'sketch.tangency.no-solution',
  'sketch.tangency.ambiguous',
  'sketch.text.font-not-found',
  'sketch.text.empty-content',
  'feature.emboss-text.face-too-small',
  'feature.emboss-text.depth-zero',
  'feature.emboss-text.boolean-noop',
  'feature.subtractive-noop',
  'feature.intersection-empty',
  'feature.empty-result',
  'feature.project-curve.no-intersection',
  'feature.project-curve.curve-empty',
  'feature.face.invalid-uv-anchor',
  'feature.face-ref.not-resolvable',
  'feature.face-ref.not-applicable',
  'feature.face-ref.not-supported',
  'feature.face-ref.ambiguous-after-split',
  'feature.face-ref.removed',
  'feature.face-ref.snapshot-fallback-used',
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
  'cli.host-fs-unavailable',
  'cli.file-read',
  'cli.file-write',
  'cli.export-exception',
  'export.feature-not-found',
  'export.no-shape',
  'export.options-format-mismatch',
  'export.dxf.non-planar',
  'export.3mf.not-watertight',
  'export.mesh.not-watertight',
  'export.part.not-found',
  'export.glb.draco-glass-conflict',
  'export.urdf.cylindrical-lossy',
  'export.urdf.pin-slot-lossy',
  'export.urdf.ball-decomposed',
  'export.urdf.closed-loop',
  'export.urdf.inertia-density-declared',
  'export.srdf.acm-sparse-sampling',
  'export.srdf.planning-group-missing',
  'export.sdf-gazebo.cylindrical-lossy',
  'export.sdf-gazebo.pin-slot-lossy',
  'export.sdf-gazebo.invalid-version',
  'export.sdf-gazebo.dangling-link-ref',
  'export.sdf-gazebo.pose-unsolved',
  'export.gcode.slicer-unavailable',
  'export.gcode.exceeds-bed',
  'feature.nurbs.degenerate-controls',
  'feature.nurbs.degree-mismatch',
  'feature.nurbs.bridge-conversion-failed',
  'feature.pattern.source-not-found',
  'feature.pattern.count-out-of-range',
  'feature.sheetMetal.kfactor-invalid',
  'feature.bend.edge-not-linear',
  'feature.flattenPattern.multi-bend-unsupported',
  'feature.draft.failed',
  'feature.draft.neutral-plane-derived',
  'feature.sdf.field-undefined',
  'feature.sdf.materialize-resolution-out-of-range',
  'feature.reference-image.path-not-found',
  'feature.reference-image.invalid-plane',
  'feature.reference-image.scale-out-of-range',
  'feature.reference-image.format-unsupported',
  'feature.render-environment.conflicting-spec',
  'feature.render-environment.missing-spec',
  'feature.render-environment.unknown-preset',
  'feature.render-environment.intensity-out-of-range',
  'feature.camera-target.non-finite-target',
  'feature.camera-target.invalid-distance',
  'feature.material.invalid-base-color',
  'feature.material.value-clamped',
  'feature.material.face-label-no-match',
  'feature.material.thickness-negative',
  'feature.material.attenuation-distance-invalid',
  'feature.material.anisotropy-rotation-normalized',
  'feature.material.texture-not-found',
  'feature.material.texture-unsupported-format',
  'feature.material.texture-oversize-warning',
  'feature.material.texture-oversize-error',
  'feature.finish.unknown-token',
  'feature.edge-feature.short-edges-skipped',
  'assembly.placement-ignored-by-mate-fk',
  'assembly.mates-ignored-by-model-call',
  'assembly.part.floating',
  'assembly.part.orphan',
  'assembly.interference.overlap',
  'assembly.part.under-constrained',
  'assembly.mate.over-constrained',
  'assembly.mate.type-mismatch',
  'assembly.mate.connector-not-found',
  'assembly.loop.unclosed',
  'assembly.solver.did-not-converge',
  'assembly.pose.out-of-limits',
  'assembly.pose-envelope.solve-failed',
  'assembly.pose-envelope.interference',
  'assembly.pose-envelope.clearance-violated',
  'assembly.pose-envelope.clearance-unresolved',
  'assembly.pose-envelope.connector-unresolved',
  'assembly.gripper-aperture.connector-missing',
  'assembly.mate.limit-missing',
  'assembly.connectivity.floating-moving-part',
  'assembly.connectivity.no-load-path',
  'assembly.joint-topology.missing-limit',
  'assembly.joint-topology.unsupported-axis',
  'assembly.joint-topology.connector-missing',
  'assembly.joint-topology.axis-invalid',
  'assembly.mounting-hole.mismatch',
  'assembly.joint-axis.unbound',
  'assembly.joint.child-modeled-in-place',
  'assembly.structure.unstructured-bodies',
  'assembly.joint.load-exceeded',
  'assembly.joint.not-visible',
  'assembly.mate.not-physically-realized',
  'assembly.joint.static-hold.margin-low',
  'assembly.joint.static-hold.exceeded',
  'assembly.workspace.unreachable',
  'assembly.connector.topology-not-resolvable',
  'assembly.mechanical.part-disconnected',
  'assembly.mechanical.connector-not-in-solid',
  'assembly.mechanical.mate-contact-missing',
  'assembly.mechanical.fixed-contact-missing',
  'assembly.mechanical.revolute-unsupported',
  'assembly.mechanical.revolute-contact-missing',
  'assembly.transmission.missing-for-coupled-mate',
  'assembly.transmission.path-disconnected',
  'mechanism.disconnect',
  'mechanism.interpenetration',
  'mechanism.dof-mismatch',
  'mechanism.orphan-part',
  'mechanism.unverified-budget-exceeded',
  'mechanism.joint-mesh-gap',
  'mechanism.unstable-under-gravity',
  'mechanism.drops-on-release',
  'mechanism.tendon-body-intersect',
  'assembly.visual.review-check-failed',
  'assembly.visual.review-evidence-weak',
  'assembly.visual.review-incomplete',
  'feature.curve3d.degenerate-controls',
  'feature.curve3d.weights-length-mismatch',
  'feature.curve3d.weights-non-positive',
  'feature.curve3d.knots-length-mismatch',
  'feature.curve3d.closed-endpoints-mismatch',
  'feature.curve3d.analytics.degenerate-arclength',
  'feature.curve3d.analytics.closest-point-no-converge',
  'feature.curve3d.analytics.derivatives-out-of-range',
  'feature.curve3d.analytics.tessellation-tolerance-invalid',
  'feature.curve3d.analytics.kernel-failed',
  'feature.curve3d.analytics.intersect-kernel-failed',
  'feature.curve3d.analytics.intersect-no-intersection',
  'feature.variable-sweep.sections-out-of-order',
  'feature.variable-sweep.sections-not-spanning',
  'feature.variable-sweep.spine-too-short',
  'feature.variable-sweep.profile-not-planar',
  'feature.variable-sweep.profile-empty',
  'feature.variable-sweep.frenet-degenerate',
  'feature.surface-from-boundary.corner-mismatch',
  'feature.surface-from-boundary.too-few-curves',
  'feature.surface-from-boundary.too-many-curves',
  'feature.surface-from-boundary.continuity-orphan',
  'feature.surface-from-boundary.degenerate-patch',
  'feature.surface-trim.no-intersection',
  'feature.surface-trim.non-planar',
  'feature.surface-trim.split-deferred',
  'feature.surface-sew.open-shell',
  'feature.fillet.continuity-not-applicable',
  'feature.hermite-g2.degenerate-tangent',
  'feature.hermite-g2.non-finite-input',
  'feature.path.spline.degenerate-points',
  'feature.path.spline.tangent-zero-magnitude',
  'feature.path.spline.tangent-on-2d-only',
  'feature.path.nurbs-segment.degenerate-controls',
  'feature.path.nurbs-segment.weights-non-positive',
  'feature.path.hermite-g2.start-mismatch',
  'tool.trace-from-image.invalid-image-url',
  'tool.trace-from-image.no-features-requested',
  'tool.trace-from-image.image-fetch-failed',
  'tool.trace-from-image.backend-failed',
  'tool.trace-from-image.opencv-cannot-label',
  'tool.trace-from-image.trace-timeout',
  'tool.send-to-printer.unreachable',
  'tool.send-to-printer.upload-failed',
  'mesher.cone-self-intersection',
  'parts.input.id-or-query-required',
  'parts.fetch.offline-and-uncached',
  'parts.fetch.checksum-mismatch',
  'parts.fetch.checksum-drift',
  'parts.fetch.api-error',
  'parts.fetch.remote-disabled',
  'parts.fetch.geometry-not-brep',
  'dfm.input.vendor-required',
  'dfm.input.material-required',
  'dfm.input.thickness-required',
  'dfm.units.dxf-not-mm',
  'dfm.material.unknown-sku',
  'dfm.thickness.not-stocked',
  'dfm.thickness.out-of-range',
  'dfm.thickness.out-of-range-for-service',
  'dfm.hole.below-minimum',
  'dfm.slot.below-minimum',
  'dfm.web.below-minimum',
  'dfm.bend.radius-below-minimum',
  'dfm.bend.angle-too-acute',
  'dfm.bend.length-exceeds-max',
  'dfm.bend.flange-too-short',
  'dfm.bend.channel-ratio-too-low',
  'dfm.bend.layer-missing',
  'dfm.bending.material-unsupported',
  'dfm.size.below-minimum',
  'dfm.size.exceeds-instant-quote',
  'dfm.size.exceeds-max',
  'dfm.dxf.spline-present',
  'dfm.dxf.tessellation-near-tolerance',
  'dfm.rule.threshold-unknown',
  'dfm.wall.too-thin',
  'dfm.clearance.violated',
  'dfm.channel.openings-mismatch',
  'dfm.void.undeclared',
  'dfm.fdm.overhang-unsupported',
  'dfm.fdm.bridge-too-long',
  'dfm.fdm.wall-below-nozzle',
  'dfm.fdm.feature-too-small',
  'dfm.fdm.bed-contact-low',
  'dfm.fdm.tip-risk',
  'dfm.fdm.exceeds-bed',
  'kinematic.collision.swept',
  'kinematic.collision.swept.sample-density-warning',
  'kinematic.unreachable',
  'kinematic.reachability.iteration-cap-hit',
  'kinematic.solver.unsupported-config',
  'kinematic.load-exceeds-yield',
  'kinematic.load.beam-not-applicable',
  'kinematic.no-material-declared',
  'kinematic.static-hold.no-actuator-declared',
  'kinematic.sweep-tolerance.combo-cap-exceeded',
  'kinematic.mounting-hole.diameter-mismatch',
  'kinematic.pose.out-of-limits',
  'kinematic.mounting-hole.no-coverage',
  'query.empty',
  'query.over-determined',
  'query.evaluated-too-early',
  'query.unknown-id',
  'query.unknown-label',
  'query.id-hierarchy-clash',
  'query.unsupported-entity-type',
  'query.composition-strict-failure',
  'query.type-mismatch',
  'query.invalid-syntax',
  'animation.param.unknown',
  'animation.track.duplicate-param',
  'animation.keys.invalid',
  'animation.value.clamped',
  'animation.view.shadowed',
  'animation.collision',
  'animation.bake.geometry-param',
  'drawing.datum.unresolved',
  'drawing.tolerance.feature-unresolved',
  'drawing.section.plane-misses-body',
  'drawing.annotation.overlap',
  'drawing.auto.datum-ambiguous',
  'drawing.auto.hole-unclassified',
  'reference.assumptions.unresolved',
  'reference.assumptions.ledger-not-found',
  'reference.assumptions.unknown-resolution-id',
  'reference.drawing.raster-only',
  'reference.drawing.view-ambiguous',
  'reference.drawing.dimension-unassociated',
  'reference.drawing.depth-missing',
  'reference.mesh.not-watertight',
  'reference.mesh.low-fidelity',
  'reference.mesh.freeform-region-unmatched',
  'fea.safety-factor.below-min',
  'fea.mesh.quality-low',
  'fea.solver.unavailable',
  'fea.study.fixed-unresolved',
  'fea.study.load-unresolved',
  'tool.repair.no-candidate',
  'tool.repair.out-of-region',
  'tool.repair.exhausted',
  'tool.repair.source-drift',
  'export.usd.joint-unsupported',
  'export.usd.pose-unsolved',
  'export.usd.mass-missing',
  'diff.body.unmatched',
  'bom.material.unassigned',
  'bom.purchased.catalog-metadata-missing',
  'render.explode.no-assembly',
  'drawing.balloons.bom-unavailable',
  'feature.curve-bridge.degenerate-end',
  'feature.surface-intersection.none',
  'feature.loft.rail-miss',
  'inspect.continuity.g1-break',
  'inspect.continuity.broken',
  'inspect.curvature.spike',
] as const satisfies readonly DiagnosticCode[];

// LEGACY_CODE_ORDER may contain each code at most once. A duplicate would
// let DIAGNOSTIC_CODES.length still equal DIAGNOSTIC_REGISTRY's key count
// (masking the guard in tests/unit/diagnostics/registry.test.ts) while a
// real code silently disappears from HINT_TEMPLATES/NEXT_ACTIONS. Checked
// at module load, not just in tests, so a bad edit fails immediately for
// any importer, not only whoever runs the test suite next.
if (new Set(LEGACY_CODE_ORDER).size !== LEGACY_CODE_ORDER.length) {
  throw new Error('LEGACY_CODE_ORDER contains a duplicate diagnostic code');
}

const LEGACY_ORDER_SET = new Set<DiagnosticCode>(LEGACY_CODE_ORDER);

// DIAGNOSTIC_CODES is the frozen legacy order followed by any code that
// exists in DIAGNOSTIC_REGISTRY but not in LEGACY_CODE_ORDER, in
// registry-spread order. Today the filter yields nothing (the registry
// holds exactly the 309 legacy codes), so this is byte-identical to
// `LEGACY_CODE_ORDER` — see registryProjectionSnapshot.test.ts. A code
// added later to any `registry/<group>.ts` file appears here, in
// HINT_TEMPLATES and in NEXT_ACTIONS automatically, with no edit to this
// file required; its position is appended after the legacy 309 rather than
// interleaved with its domain, which is fine because order here is a
// stability contract (existing agents/tools rely on stable positions), not
// a semantic grouping.
export const DIAGNOSTIC_CODES: readonly DiagnosticCode[] = [
  ...LEGACY_CODE_ORDER,
  ...(Object.keys(DIAGNOSTIC_REGISTRY) as DiagnosticCode[]).filter((code) => !LEGACY_ORDER_SET.has(code)),
];

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
