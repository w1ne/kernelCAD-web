import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_CODES, HINT_TEMPLATES } from '../../../src/shared/diagnostics/registry';

describe('diagnostic catalogue invariants', () => {
  it('emits exactly 276 codes', () => {
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
    // + 4 drawing.* — svg-drawing GD&T annotation kinds (hole/fillet/chamfer
    //   reuse feature.selection.no-match; datum/fcf/section/overlap needed
    //   their own group and codes): drawing.datum.unresolved,
    //   drawing.tolerance.feature-unresolved, drawing.section.plane-misses-body,
    //   drawing.annotation.overlap = 252.
    // + 3 Slice E image/photo-reference assumption ledger:
    //   reference.assumptions.unresolved (trace_from_image's ledger has open
    //   facts), reference.assumptions.ledger-not-found (resolve_assumptions
    //   given a bad ledgerPath), reference.assumptions.unknown-resolution-id
    //   (resolve_assumptions given a resolution id absent from the ledger).
    //   = 251.
    // + 5 structural FEA gate (fea.* — shape.feaStudy declaration + solver
    //   run): fea.safety-factor.below-min, fea.mesh.quality-low,
    //   fea.solver.unavailable, fea.study.fixed-unresolved,
    //   fea.study.load-unresolved. = 253.
    // + 2 gcode export (Slice B — print loop): export.gcode.slicer-unavailable,
    //   export.gcode.exceeds-bed. = 250.
    // + 2 send_to_printer (Slice B — print loop): tool.send-to-printer.unreachable,
    //   tool.send-to-printer.upload-failed. = 252.
    // + 4 tool.repair.* (trace-guided repair: repair_script's own failure
    //   vocabulary — no-candidate, out-of-region, exhausted, source-drift).
    //   = 252.
    // + 2 assembly.joint.static-hold.margin-low / .exceeded (checkStaticHold
    //   — gravitational torque/force vs declared actuator capacity). = 250.
    // + 2 kinematic.static-hold.no-actuator-declared,
    //   kinematic.sweep-tolerance.combo-cap-exceeded (checkStaticHold's
    //   missing-actuator guard + sweepTolerance's 64-combo cartesian cap).
    //   = 252.
    //  + 2 USD Isaac export fail-closed gates: export.usd.joint-unsupported
    //    (a mate kind with no UsdPhysics joint equivalent) and
    //    export.usd.mass-missing (a link whose mass-properties are non-finite
    //    or non-positive, which PhysX rejects).
    //  + 1 diff.body.unmatched (diff_geometry could not pair a body across the
    //    two models by name or by positional fallback — the first code in the
    //    new `diff` group).
    //   = 251.
    //  + 1 export.usd.pose-unsolved (usd-isaac could not solve the mate graph
    //    to per-link poses; links spawn at the stage origin — the USD sibling
    //    of export.sdf-gazebo.pose-unsolved). = 252.
    expect(DIAGNOSTIC_CODES).toHaveLength(276);
    expect(new Set(DIAGNOSTIC_CODES).size).toBe(276);
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
