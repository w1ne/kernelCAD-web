import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_CODES, HINT_TEMPLATES } from '../../../src/shared/diagnostics/registry';

describe('diagnostic catalogue invariants', () => {
  it('emits exactly 237 codes', () => {
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
    expect(DIAGNOSTIC_CODES).toHaveLength(240);
    expect(new Set(DIAGNOSTIC_CODES).size).toBe(240);
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
