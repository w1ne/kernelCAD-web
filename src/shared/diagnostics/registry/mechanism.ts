// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const MECHANISM_CODES = {
  // Mechanism truth — pose-sweep grounded loop (4)
  //
  // The recompute pipeline runs sampled poses and refuses to certify a
  // mechanism unless physics agrees. See
  // `docs/specs/2026-06-01-physics-grounded-loop-design.md` and the P0
  // implementation in `src/modeling/runtime/mechanismTruth.ts`. These codes
  // are emitted only by that pipeline and never by the authoring-time
  // gates — they describe what a real physical assembly fails to satisfy
  // under motion (not what the agent wrote at capture time).
  'mechanism.disconnect': {
    hintTemplate:
      "A fastened mate isn't physically realized: the part declared as fastened drifts when another joint moves. Bind the fastened-mate connector to a topology feature (face center, edge, mounting hole) on the anchor part, or use joint.clevis(...) / a physical pin so the geometry actually rigidifies. See docs/specs/2026-06-01-physics-grounded-loop-design.md §criterion 1.",
    nextAction: { kind: 'fix-arg', field: 'mateConnectorOrigin' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'At a sampled pose the assembly has more disconnected solid components than the mate graph predicts — typically a fastened mate whose connector is a numeric vec3 origin fails to actually rigidify the parts under motion.',
  },
  'mechanism.interpenetration': {
    hintTemplate:
      "Two non-mated parts overlap at a sampled pose. Add clearance, reduce mate travel, or move the mounting geometry so the swept pose stays collision-free. If the contact is intentional, declare a mate between the parts so the loop knows about it.",
    nextAction: { kind: 'fix-arg', field: 'partGeometry' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'At a sampled pose, two parts that are NOT joined by a mate overlap by more than the epsilon volume floor (intentional contact at clevis joints is excluded).',
  },
  'mechanism.dof-mismatch': {
    hintTemplate:
      "A mate's declared kind doesn't match its geometric degrees of freedom under motion. Re-check the mate axis, the connector frames on both parts, and the mate type — micro-poses around the declared axis are changing the component count, which means the geometric constraint is not what was declared.",
    nextAction: { kind: 'fix-arg', field: 'mateType' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'A mate declares one geometric DoF (revolute axis / prismatic axis) but the geometry under micro-pose change behaves as if a different DoF were free.',
  },
  'mechanism.orphan-part': {
    hintTemplate:
      "A part declared via arm.part(...) is unreachable from the assembly graph. Connect it to another part — either a mate (arm.mate(...)) or a joint primitive (arm.revolute/.prismatic/.ball) counts — or remove the part if it isn't structurally needed.",
    nextAction: { kind: 'rewrite-feature', guidance: 'add a mate or joint primitive that connects the orphan part to the rest of the assembly graph' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'A part declared on the assembly is not reachable from any other part via mate, joint-primitive, or connect edges — the assembly graph is disconnected.',
  },
  // Physics-grounded loop — T3 slice (post-condition trust gate). Emitted by
  // `mechanismTruth.ts` when the BREP pose-sweep work estimate exceeds the
  // (auto-scaled) budget and criteria 2/3/7/8 are SKIPPED, degrading the
  // verdict to 'unverified'. Replaces the old silent console.warn: the
  // 'unverified' verdict now carries machine-readable evidence (work
  // estimate, budget, part count) so an agent can react instead of mistaking
  // it for a clean 'real'. Non-fatal (severity 'warn') — "could not verify"
  // is not "broken".
  'mechanism.unverified-budget-exceeded': {
    hintTemplate:
      "The articulated collision/pose sweep was skipped because its estimated work exceeded the budget, so the mechanism is 'unverified' (NOT certified collision-free). Verify a tractable subset of the assembly, reduce the part/pose count, or pass a larger sweepBudget to force a full sweep. The cheap criteria (orphan-part, fastened-rigidity) still ran.",
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'mechanism',
    description: 'The deterministic BREP pose-sweep work estimate exceeded the (auto-scaled) budget; the articulated overlap criteria were skipped and the mechanism verdict degraded to unverified rather than running an intractable sweep.',
  },
  'mechanism.joint-mesh-gap': {
    hintTemplate:
      'Extend the parent body geometry so its OCCT solid reaches the joint origin at rest pose. Most commonly: increase the height of the column / boss that hosts the joint, or move the part-local connector origin onto an actual face/edge of the body. A pivot deliberately in open space (annular rim seat, spindle riding in the bore of a fastened block) passes when the mated rigid groups maintain bearing contact within tolerance somewhere away from the axis.',
    nextAction: { kind: 'fix-arg', field: 'partGeometry' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'A joint pivot lies outside its mated body BREP surface at rest pose and the mated rigid groups have no bearing contact within tolerance anywhere — the link is floating on the joint it pivots on.',
  },
  // Physics-grounded loop — P6 slice. The two physics criteria
  // (static-equilibrium + drop-on-release) emit these codes from
  // `src/modeling/runtime/mechanismTruth.ts` when `physicsCheck` is
  // enabled (CLI: `validate --include-physics`). The hints point at the
  // structural fix; in the v0.7 corpus single-body springs cannot pass
  // the drop-test (they produce zero restoring moment around the joints
  // they should brace) — the long-term fix is the closed-loop tendon /
  // spring API tracked in issue #361.
  'mechanism.unstable-under-gravity': {
    hintTemplate:
      "At a sampled pose, MuJoCo's inverse dynamics couldn't compute a finite holding torque — the mechanism has a singular configuration there. Verify that every part has a declared (or default) density, that joint axes pass through the parts' material, and that the chain doesn't have a redundant constraint. If a real joint actuator is intended (servo, motor), declare it via the planned `arm.mate(..., 'revolute', { capacityNm: <torque> })` API (TODO: capacity API).",
    nextAction: { kind: 'rewrite-feature', guidance: 'verify part density / joint axes / chain topology so the mechanism has a finite holding torque at every sampled pose' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'At a sampled pose the mechanism requires a non-finite (NaN / Infinity) joint torque to hold itself against gravity. Indicates a singular kinematic configuration, a degenerate inertia tensor, or a redundant constraint.',
  },
  'mechanism.drops-on-release': {
    hintTemplate:
      "Starting from rest, the mechanism drifted by more than 5° at a joint or 50 mm at a body during a 0.5 s gravity simulation. Add a closed-loop spring / tendon crossing the drifting joint (issue #361 tracks this API), declare the joint as actively driven via the planned capacity API, or restructure the chain so gravity doesn't open it. Single-body 'spring' parts fastened to one arm contribute zero restoring moment and cannot pass this gate.",
    nextAction: { kind: 'rewrite-feature', guidance: 'add a closed-loop spring or declare the joint as actively driven; single-body springs contribute no joint moment and cannot pass the drop-test' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'Starting from REST, the mechanism does not hold its declared pose under gravity: at least one joint drifts > 5° or one body translates > 50 mm in a 0.5 s passive simulation. Means the mechanism would visibly collapse on a desk without an actuator or closed-loop spring.',
  },
  // Physics-loop P11 Slice 2 — static tendon-routing backstop. Emitted by
  // `mechanismTruth.ts` criterion 8 when a balance tendon's routed path
  // cuts through a body it is neither anchored to nor routing around. The
  // runtime counterpart is MuJoCo wrap-geom routing; this code is the
  // design-time gate that red-flags "the spring goes through the arm"
  // before MuJoCo is asked to spin up.
  'mechanism.tendon-body-intersect': {
    hintTemplate:
      "A tendon's routed path passes through (or within 0.5 mm of) a part it is not anchored to and does not route around. Declare a wrap geom on the offending part via part.wrapGeom(name, { axis, radius }) and add it to the tendon's wrapGeoms so the cable rides over the body, or relocate the tendon anchors so the straight line stays clear at every sampled pose.",
    nextAction: { kind: 'rewrite-feature', guidance: 'route the tendon around the body with a wrap geom, or relocate its anchors so the cable stays clear of non-anchor parts at every pose' },
    defaultSeverity: 'error',
    group: 'mechanism',
    description: 'A balance tendon\'s routed polyline passes through the solid interior of a part that is neither one of its anchor parts nor a wrap-geom rail it routes around, at some sampled pose. Means the spring would visibly cut through structure.',
  },
} as const satisfies Record<`mechanism.${string}`, DiagnosticCodeSpec>;
