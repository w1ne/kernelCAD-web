// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const KINEMATIC_CODES = {
  // Kinematic grounding (9) — K1-K9. Local sampled-pose collision sweep,
  // analytical / numeric IK reachability, closed-form beam load capacity,
  // and fastener-side hole-diameter agreement. Every check runs in-process
  // (no external solver, no network round-trip).
  'kinematic.collision.swept': {
    hintTemplate:
      'Swept-collision found one or more poses at which two parts interpenetrate. Inspect result.collidingPoses[] for (pose, contacts[]) pairs; narrow joint limits, reshape the colliding parts, or insert clearance and re-run checkSweptCollision.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'narrow joint limits or reshape parts to eliminate the listed colliding poses',
    },
    defaultSeverity: 'error',
    group: 'kinematic',
    description:
      'Sweep across declared joint range(s) produced one or more poses at which any two parts share a non-empty BREP boolean intersection.',
  },
  'kinematic.collision.swept.sample-density-warning': {
    hintTemplate:
      'Sample density below the safe floor (revolute < 36 samples or prismatic < 25 samples across the requested range). The result may miss mid-range collisions. Tighten opts.range step, or extend the range to span more of the joint limits.',
    nextAction: { kind: 'fix-arg', field: 'opts.range' },
    defaultSeverity: 'warn',
    group: 'kinematic',
    description:
      'Caller-supplied range produced fewer than the safe-floor sample count for the joint type; checkSweptCollision proceeded but the result is sparser than recommended.',
  },
  'kinematic.unreachable': {
    hintTemplate:
      'IK could not satisfy the requested target. If axis=position, lengthen a link, change DOF count, or move the target. If axis=orientation, widen target.orientation tolerance or drop the orientation constraint. If axis=both, the target is far outside reachable workspace; restructure the chain.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance:
        'see emitted error.axis to choose: lengthen/restructure the chain for position/both, or widen the orientation tolerance',
    },
    defaultSeverity: 'error',
    group: 'kinematic',
    description:
      'Inverse-kinematics solver (analytical or numeric) failed to find a pose satisfying target.position and/or target.orientation within tolerance.',
  },
  'kinematic.reachability.iteration-cap-hit': {
    hintTemplate:
      'Numeric IK hit opts.maxIterations (default 200) before convergence; the result is inconclusive and closestApproach is the best-error pose seen. Increase opts.maxIterations or widen target tolerances.',
    nextAction: { kind: 'fix-arg', field: 'opts.maxIterations' },
    defaultSeverity: 'warn',
    group: 'kinematic',
    description:
      'Numeric inverse-kinematics solver hit its iteration cap before satisfying the target tolerances.',
  },
  'kinematic.solver.unsupported-config': {
    hintTemplate:
      'v1 does not support closed-loop or parallel-kinematics chains (cycle detected in the mate graph), and analytical IK is rejected when the chain does not satisfy the closed-form solvability condition. Cut the closed-loop cycle in the mate graph, or switch preferSolver to numeric.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance:
        'cut the closed-loop cycle in the mate graph, or switch preferSolver to numeric',
    },
    defaultSeverity: 'error',
    group: 'kinematic',
    description:
      'The IK dispatcher cannot service the requested chain — either a closed kinematic loop is present or analytical IK was requested for a chain that does not match the closed-form solvability condition.',
  },
  'kinematic.load-exceeds-yield': {
    hintTemplate:
      'Closed-form beam check shows stress at the named element exceeds material yield (see error.message for stress, yield, safety factor). Thicken the cross-section, switch to a stronger material, or shorten the moment arm.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance:
        'thicken the cross-section, change material, or shorten the moment arm',
    },
    defaultSeverity: 'error',
    group: 'kinematic',
    description:
      'Closed-form Euler-Bernoulli beam analysis predicts an element stress that exceeds the declared material yield strength.',
  },
  'kinematic.load.beam-not-applicable': {
    hintTemplate:
      'Closed-form beam approximation does not apply: the load is not at the free end, the part has more than one mate, the deflection/length ratio is too large, or the cross-section is unsupported. The result for this element is unreliable. Decompose the part into beam-fitting cantilever segments, or defer to FEA when it ships.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance:
        'decompose the part into beam-fitting cantilever segments, or defer the check until FEA support lands',
    },
    defaultSeverity: 'warn',
    group: 'kinematic',
    description:
      'checkLoadCapacity({ mode: "beam" }) detected a configuration outside the closed-form Euler-Bernoulli assumptions; the result for the affected element is unreliable.',
  },
  'kinematic.no-material-declared': {
    hintTemplate:
      'checkLoadCapacity({ mode: "beam" }) requires opts.materials[partName] for every loaded part. Declare the per-part material (see error.message for the missing parts). No silent default material is applied.',
    nextAction: { kind: 'fix-arg', field: 'opts.materials' },
    defaultSeverity: 'error',
    group: 'kinematic',
    description:
      'A load-capacity check ran in beam mode but the caller did not declare a material for one or more loaded parts; the check refused to silently substitute a default.',
  },
  'kinematic.static-hold.no-actuator-declared': {
    hintTemplate:
      "checkStaticHold requires an actuator: { torqueNm } (revolute) / { forceN } (prismatic) declaration on the joint(s) it evaluates. Add actuator to arm.revolute(...)/arm.prismatic(...). No silent default capacity is applied.",
    nextAction: { kind: 'fix-arg', field: 'actuator' },
    defaultSeverity: 'error',
    group: 'kinematic',
    description: 'checkStaticHold was asked to evaluate a joint (explicitly named, or as the only candidate) that has no declared actuator torque/force capacity; the check refused to silently substitute a default.',
  },
  'kinematic.sweep-tolerance.combo-cap-exceeded': {
    hintTemplate:
      "The cartesian product of swept param values exceeds the 64-combo cap; only the first 64 (declaration order) were evaluated. Narrow the swept ranges/values, or split the sweep into multiple calls.",
    nextAction: { kind: 'fix-arg', field: 'params' },
    defaultSeverity: 'warn',
    group: 'kinematic',
    description: 'sweepTolerance declared params whose cartesian product exceeds the 64-combination cap; the sweep truncated to the first 64 combos in declaration order.',
  },
  'kinematic.mounting-hole.diameter-mismatch': {
    hintTemplate:
      'Fastener-side connectors on this mate have non-matching hole diameters (see error.message for the two values). Adjust the hole diameter on one side so both sides agree.',
    nextAction: { kind: 'fix-arg', field: 'connector.hole.diameter' },
    defaultSeverity: 'error',
    group: 'kinematic',
    description:
      'A fastened mate binds two connectors whose hole diameters disagree beyond the diameter-match tolerance; the underlying assembly.mounting-hole.mismatch code also fires from the v0.7.4 substrate.',
  },
  'kinematic.pose.out-of-limits': {
    hintTemplate:
      'A pose value supplied to assembly.solve()/solvedModel() falls outside the joint\'s declared limitsDeg/limitsMm. Clamp the pose into the declared range, or widen the joint limits if the mechanism is intended to travel that far.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance:
        'clamp the joint pose into the declared limits, or widen limitsDeg/limitsMm on the joint if the travel is intended',
    },
    defaultSeverity: 'warn',
    group: 'kinematic',
    description:
      'A revolute/prismatic joint pose passed to assembly.solve() or assembly.solvedModel() exceeds the closed limitsDeg/limitsMm range declared on that joint; the pose is still applied (advisory warning, not a hard failure).',
  },
  'kinematic.mounting-hole.no-coverage': {
    hintTemplate:
      'The mounting-hole consistency check found no fastened mates to examine, so a green result verifies nothing. Add at least one arm.mate(..., \'fastened\') between connectors bound to face-center holes, or stop relying on this gate for fastener coverage.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance:
        'add a fastened mate between connectors bound to face-center holes so the mounting-hole gate has something to verify',
    },
    defaultSeverity: 'info',
    group: 'kinematic',
    description:
      'checkMountingHoleConsistency ran on an assembly with zero fastened mates; nothing was checked, so the otherwise-green result is vacuous (no coverage).',
  },
} as const satisfies Record<`kinematic.${string}`, DiagnosticCodeSpec>;
