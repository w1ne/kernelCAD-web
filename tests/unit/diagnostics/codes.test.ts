import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_CODES, HINT_TEMPLATES } from '../../../src/shared/diagnostics/registry';

describe('diagnostic catalogue invariants', () => {
  it('emits exactly 315 codes', () => {
    // 204 from develop (NURBS analytics, Query DSL, K1-K9 kinematic, assembly/mechanism gates)
    // + 6 parts catalog codes (parts.* — Slice C bundled parts catalog)
    // + 1 feature.emboss-text.boolean-noop (#393 silent no-op guard)
    // + 2 W2 export suite: export.mesh.not-watertight, export.part.not-found
    // + 1 cli.file-write (W2 part-mode export: structured output-write failures)
    // + 4 W3 DFM gates: dfm.wall.too-thin, dfm.clearance.violated,
    //   dfm.channel.openings-mismatch, dfm.void.undeclared.
    // + 6 animation views (multi-track keyframe animationView):
    //   animation.param.unknown, animation.track.duplicate-param,
    //   animation.keys.invalid, animation.value.clamped,
    //   animation.view.shadowed, animation.collision.
    // + 1 assembly.structure.unstructured-bodies (agent-parts-discipline:
    //   multi-body model with no named assembly().part(...) structure).
    // + 1 animation.bake.geometry-param (Studio bake refuses geometry-driving
    //   track params — only pose-only mate timelines bake to rigid transforms).
    // + 1 export.sdf-gazebo.pose-unsolved (simulator-verified SDF export:
    //   mate graph unsolvable -> links emitted at the model origin). = 227.
    // + 6 NURBS Slice E surface-finishing:
    //   feature.surface-trim.no-intersection, legacy surface-trim non-planar/split-deferred,
    //   feature.surface-sew.open-shell,
    //   feature.draft.failed, feature.draft.neutral-plane-derived. = 233.
    // + 1 feature.subtractive-noop (subtractive boolean/hole/cutout that
    //   removes no material). = 234.
    // + 2 feature.intersection-empty, feature.empty-result (additive/primitive
    //   no-op: empty intersection, degenerate solid create). = 236.
    // + 1 mechanism.unverified-budget-exceeded (this PR — T3 post-condition
    //   gate: the over-budget BREP pose-sweep skip is now a LOUD structured
    //   diagnostic instead of a silent console.warn). = 237.
    // + 1 tool.trace-from-image.trace-timeout (forward-ported: pure-JS tracer hard per-call timeout). = 238.
    // + 1 kinematic.pose.out-of-limits (#537 — advisory warning when a
    //   solve()/solvedModel() pose value exceeds a joint's declared
    //   limitsDeg/limitsMm; the pose is still applied). = 239.
    // + 1 kinematic.mounting-hole.no-coverage (#541 — info diagnostic when
    //   checkMountingHoleConsistency examined zero fastened mates, so the
    //   green result verifies nothing). = 240.
    // + 2 articulated pose-envelope DFM clearance diagnostics:
    //   assembly.pose-envelope.clearance-violated,
    //   assembly.pose-envelope.clearance-unresolved. = 242.
    // + 1 parts.fetch.geometry-not-brep (fetch_part hit a catalog record whose
    //   only geometry is a GLB display mesh — the authored `*-board` entries,
    //   which drop stepUrl by design). = 243.
    // + 1 cli.host-fs-unavailable (a script called a filesystem-backed feature
    //   — referenceImage, lib.fromSTEP/fromSTL/fromDXF/fromSVG, fontPath fonts,
    //   parts catalog — from a runtime with no filesystem, i.e. the in-browser
    //   script engine).
    // + 2 Geom2dGcc tangency outcomes: sketch.tangency.no-solution (no circle
    //   or line satisfies the requested tangencies) and
    //   sketch.tangency.ambiguous (several do, and no hint said which).
    //   = 246.
    // + 1 feature.finish.unknown-token (named-finish front door: .finish() with
    //   a name not in the curated finish table fails loudly, no silent default).
    //   = 247.
    // + 1 assembly.joint.child-modeled-in-place (joint primitive drives a part
    //   the script also placed — the URDF/mate convention mix, which displaces
    //   the child by the joint origin at every pose).
    //   = 248.
    // + 4 drawing annotations and section views: drawing.datum.unresolved,
    //   drawing.tolerance.feature-unresolved, drawing.section.plane-misses-body,
    //   drawing.annotation.overlap = 252.
    // + 3 image/photo reference assumption ledger:
    //   reference.assumptions.unresolved, reference.assumptions.ledger-not-found,
    //   reference.assumptions.unknown-resolution-id = 255.
    // + 5 structural FEA gate: fea.safety-factor.below-min,
    //   fea.mesh.quality-low, fea.solver.unavailable, fea.study.fixed-unresolved,
    //   fea.study.load-unresolved = 260.
    // + 4 print loop: export.gcode.slicer-unavailable,
    //   export.gcode.exceeds-bed, tool.send-to-printer.unreachable,
    //   tool.send-to-printer.upload-failed = 264.
    // + 4 trace-guided repair: tool.repair.exhausted, tool.repair.no-candidate,
    //   tool.repair.out-of-region, tool.repair.source-drift = 268.
    // + 4 mechanism checks: assembly.joint.static-hold.exceeded,
    //   assembly.joint.static-hold.margin-low,
    //   kinematic.static-hold.no-actuator-declared,
    //   kinematic.sweep-tolerance.combo-cap-exceeded = 272.
    // + 4 USD physics export and geometry diff: export.usd.joint-unsupported,
    //   export.usd.pose-unsolved, export.usd.mass-missing, diff.body.unmatched =
    //   276.
    // + 2 BOM extraction: bom.material.unassigned,
    //   bom.purchased.catalog-metadata-missing = 278.
    // + 2 exploded views: render.explode.no-assembly,
    //   drawing.balloons.bom-unavailable = 280.
    // + 7 FDM printability check (dfmSpec process 'fdm'): dfm.fdm.overhang-unsupported,
    //   dfm.fdm.bridge-too-long, dfm.fdm.wall-below-nozzle, dfm.fdm.feature-too-small,
    //   dfm.fdm.bed-contact-low, dfm.fdm.tip-risk, dfm.fdm.exceeds-bed = 287.
    // + 2 sketch-from-shape: feature.section.plane-misses-body,
    //   feature.face-sketch.non-planar = 289.
    // + 1 feature.async-result.missing-await (agent chained a Sketch method
    //   directly on the un-awaited Promise<Sketch> from sectionSketch/
    //   faceSketch/silhouette). = 290.
    // + 2 automatic drawing annotation: drawing.auto.datum-ambiguous,
    //   drawing.auto.hole-unclassified = 292.
    // + 4 engineering-drawing PDF import: reference.drawing.raster-only,
    //   reference.drawing.view-ambiguous, reference.drawing.dimension-unassociated,
    //   reference.drawing.depth-missing = 296.
    // + 3 mesh reconstruction: reference.mesh.not-watertight,
    //   reference.mesh.low-fidelity, reference.mesh.freeform-region-unmatched = 299.
    // + 3 curves-surfacing: feature.curve-bridge.degenerate-end,
    //   feature.surface-intersection.none, feature.loft.rail-miss = 302.
    // + 3 surface-quality inspect: inspect.continuity.g1-break,
    //   inspect.continuity.broken, inspect.curvature.spike = 305.
    // + 3 direct-edit drag: feature.direct-edit.clamped,
    //   feature.direct-edit.delta-wrapper, feature.direct-edit.unresolved = 308.
    // + 1 feature.direct-edit.shared-param-conflict (one param drives multiple
    //   translated axes with different drag deltas; drag cannot encode it) = 309.
    expect(DIAGNOSTIC_CODES).toHaveLength(315);
    expect(new Set(DIAGNOSTIC_CODES).size).toBe(315);
  });

  it('every code has a non-empty hint template', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const tmpl = HINT_TEMPLATES[code];
      expect(tmpl, `missing template for ${code}`).toBeDefined();
      expect(tmpl.template.trim().length, `empty template for ${code}`).toBeGreaterThan(0);
    }
  });

  it('HINT_TEMPLATES covers exactly the catalogue (no orphans, no missing)', () => {
    const tmplKeys = Object.keys(HINT_TEMPLATES).sort();
    const cat = [...DIAGNOSTIC_CODES].sort();
    expect(tmplKeys).toEqual(cat);
  });
});
