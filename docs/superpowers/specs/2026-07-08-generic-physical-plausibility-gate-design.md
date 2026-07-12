# Generic Physical Plausibility Gate — High-Level Design

## Problem

KernelCAD can currently reject many bad mechanisms: floating parts, disconnected bodies, unsupported joints, pose-envelope collisions, and some MuJoCo gravity/drop failures. That still allows designs that are visually connected and kinematically moving but have no declared task physics: no load, no contact contract, no actuator limit, and no stability criterion.

The goal is a generic gate that asks: "what physical situation is this assembly supposed to survive or perform?" The gate must not be hand-specific. A gripper, hinge, latch, arm, bracket, watch lug, or lamp should all use the same evidence pattern.

## Approach

Add an assembly-level declaration:

```ts
arm.physicalUseCase('hold-cylinder', {
  stableParts: ['target-cylinder'],
  loads: [{ part: 'target-cylinder', force: [0, 0, -8] }],
  contacts: [
    { a: 'thumb-finger.tip', b: 'target-cylinder.mount', normal: [-1, 0, 0], friction: 0.6 },
  ],
  actuatorLimits: [{ mate: 'grip', maxTorqueNmm: 180 }],
  criteria: { maxSlipMm: 2, settleTimeMs: 500 },
});
```

First slice is structural, not full force simulation. It checks that the assembly declares enough physics evidence to be reviewable:

- loads reference real parts and have non-zero force or torque
- contacts reference real connectors, have normals, and positive friction
- actuator limits reference real driven mates and positive torque
- stable parts reference real parts
- mechanisms can be reviewed with `requirePhysicalUseCase: true`

Later slices can consume the same record in deterministic statics and MuJoCo dynamic tasks.

## Alternatives

| Option | Description | Tradeoff |
|---|---|---|
| A recommended | Add generic `physicalUseCase(...)` records and opt-in review gate first. | Small, testable, does not break the existing corpus immediately. |
| B | Immediately make every mechanism fail without a physical use case. | Stronger product stance, but will break many current examples before the contract is mature. |
| C | Add hand/grasp-specific simulation first. | Faster for the robot hand, but repeats the mistake of building special fixtures instead of reusable tooling. |

## First Slice Acceptance

1. `review_cad({ requirePhysicalUseCase: true })` fails a mechanism with no physical use case.
2. A malformed use case fails with actionable diagnostics.
3. A minimally declared generic use case passes the use-case gate.
4. Existing reviews are unchanged unless `requirePhysicalUseCase` is set.

## Later Slices

1. Quasi-static load path and torque margin checks.
2. Contact friction/slip margin checks.
3. MuJoCo task runner: settle, gravity, impulse, disturbance, held-object pose drift.
4. Material/stiffness budget checks for bending and bearing pressure.

## Concern

This first slice proves declaration quality, not real physics. That is intentional: a reusable record must exist before statics or dynamics can consume it.
