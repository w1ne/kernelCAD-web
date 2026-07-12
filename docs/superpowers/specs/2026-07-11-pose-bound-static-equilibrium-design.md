# Pose-Bound Static Equilibrium Design

## Problem

KernelCAD now rejects a multi-contact grasp unless all declared contacts are reachable in one sampled actuator pose. The remaining physical-use-case force and torque checks are not tied to that pose: they use declared vectors and part-local connector coordinates independently, sum directional capacities, and estimate actuator torque without solving contact-force balance. Such checks can accept a grasp whose forces balance translation but not moment, or whose contact forces require more actuator torque than declared.

## First-Principles Requirement

A sampled grasp state is statically feasible only when one contact-force allocation simultaneously satisfies all of the following:

1. Every declared contact is within `criteria.maxSlipMm` at the same successfully solved pose.
2. Contact forces are compressive and stay inside a conservative Coulomb friction pyramid.
3. The net world-space force and moment on every loaded part are within explicit residual tolerances.
4. Generalized holding torque at every declared actuator stays within `maxTorqueNmm`, including declared coupled/transmitted joints.

This is a quasi-static load-case check. It does not prove arbitrary force closure, dynamic stability, impact survival, structural stiffness, or feasibility between sampled poses.

## Explicit Evidence Contract

Extend physical-use-case declarations without changing existing vector defaults:

```ts
arm.physicalUseCase('hold-object', {
  loads: [{
    part: 'object',
    at: 'object.center-of-mass',
    force: [0, 0, -8],
  }],
  contacts: [{
    a: 'finger.tip',
    b: 'object.contact',
    normal: [0, -1, 0],
    normalFrame: 'world',
    friction: 0.6,
    normalForceN: 12,
  }],
  actuatorLimits: [{ mate: 'grip', maxTorqueNmm: 180 }],
  criteria: {
    maxSlipMm: 1,
    maxForceResidualN: 0.01,
    maxTorqueResidualNmm: 0.1,
  },
});
```

- `load.at` is a connector on `load.part` and names the force application point. It is required by the statics gate when a force is declared, and at least one load must provide it as the wrench reference even for a pure-torque case. Load force and free torque vectors remain world-space; torque units are Nmm.
- `contact.normalFrame` is `'world' | 'a' | 'b'` and defaults to `'world'` for compatibility. Local normals are rotated to world space with the selected part transform.
- A contact normal points from side `b` toward side `a`. A compressive contact force acts along `+normal` on `a` and `-normal` on `b`.
- `normalForceN` is the maximum compressive normal force available at that contact and is required by the statics gate.
- A connector pair may appear only once per use case, regardless of endpoint order. Distinct physical contact patches require distinct connector evidence; duplicate declarations cannot multiply capacity.
- `maxForceResidualN` and `maxTorqueResidualNmm` default to conservative numerical tolerances. Callers may tighten them, but cannot increase them above the defaults because residual tolerance is solver hygiene, not a physical requirement that an agent may weaken.

Missing or unusable required evidence does not silently skip physics. Once a use case has a common contact pose and statics is enabled, it emits an input-incomplete blocker.

V1 deliberately supports one rigid held part per use case. Every declared load acts on that part, every contact has exactly one endpoint on it, and the held part is not a stable part or a structurally mated member of the mechanism. Multi-body held systems and contacts between two loaded bodies are uncheckable in this slice.

## Shared Pose Sampling

Refactor targeted reachability into an internal assessment that returns both findings and successfully solved contact samples. Each sample contains requested mate poses, part transforms, world-space contact points, and maximum contact distance. The existing reachability API remains as a compatibility wrapper returning only findings.

The statics evaluator consumes only complete samples whose every contact distance is within `maxSlipMm`. It never resamples or resolves the assembly independently, so reachability and statics cannot accidentally validate different states.

## Contact Model

For each contact, construct a deterministic eight-edge friction pyramid. If `n` is the unit normal and `t1`, `t2` are an orthonormal tangent basis, its generators are evenly spaced around:

```text
n + friction * (cos(theta) * t1 + sin(theta) * t2)
theta = 0, 45, 90, ... 315 degrees
```

Non-negative generator weights are constrained so their sum is at most `normalForceN`. This pyramid is inscribed in the circular Coulomb cone and is therefore conservative.

For each loaded part, assemble a six-dimensional wrench equation about an explicit reference point. External forces contribute at their `load.at` points; free torques contribute directly. Contact forces contribute at the midpoint of the two sampled connector points so the allowed slip gap does not create a fictitious couple.

## Feasibility Solver

Use a small deterministic projected-gradient feasibility search over the contact generator weights:

- Objective: normalized squared residual of all loaded-part force and moment equations plus squared actuator-limit violations.
- Constraint projection: independently project each contact's eight weights onto the non-negative capped simplex whose sum is at most `normalForceN`.
- Run a contact-only solve first. If no sampled pose balances the declared wrenches, report static equilibrium failure.
- Run a second solve including actuator-limit penalties. If equilibrium is possible but no sampled solution also satisfies torque limits, report actuator torque failure.
- A sample passes only after independently reconstructing its forces and verifying force balance, moment balance, the true circular Coulomb inequality, normal-force caps, and actuator limits against explicit tolerances. Solver convergence by itself is never a pass, and iteration exhaustion never counts as a pass.

The optimization is convex under the linearized friction pyramid. A passing post-check is a concrete force-allocation certificate. Failure wording says that no certificate was found in the sampled linearized model; it does not claim analytical impossibility.

## Actuator Torque

For each scalar revolute actuator limit, numerically differentiate every mechanism-to-held contact point displacement with respect to that actuator's source coordinate. Perturbations are expressed in radians, stay inside the mate limits, re-expand declared couplings, and re-solve the assembly. Central differences are used away from a limit and an inward one-sided difference at a limit.

Apply virtual work directly to the relative contact Jacobian:

```text
actuator generalized torque = sum(relative contact Jacobian dot mechanism-side contact force)
```

Because every perturbed sample expands the existing coupling records, source-to-driven ratios are included kinematically. Coupled motion must also have the already validated transmission intent; missing limits, failed perturbation solves, unsupported mate types, or missing transmission evidence makes statics input incomplete rather than assuming a zero torque path. V1 treats the declared transmission as ideal and lossless.

Every independent articulated mate on a mate-graph path from a mechanism-side contact to a declared stable part must resolve to an `actuatorLimits` source. Driven coupled mates resolve transitively to their independent source. A declared transmission ratio, when present, must match the corresponding kinematic coupling ratio. This prevents omitted hinges or contradictory transmission evidence from silently contributing unbounded holding torque.

## Diagnostics

Add blocking physical-use-case diagnostics:

- `assembly.physical-use-case.static-input-incomplete`
- `assembly.physical-use-case.static-equilibrium-unmet`
- `assembly.physical-use-case.static-actuator-torque-insufficient`

Diagnostics include the use-case name, best sampled poses when available, residual force/moment, actuator torque evidence, and an actionable hint. `review_cad`, mechanism fitness, and `design_loop` surface and preserve these errors like the existing contact-reachability failures.

## Integration Defaults

Add `includePhysicalUseCaseStatics` to `review_cad`. It is opt-in during this compatibility slice; the design loop enables it for physical-acceptance attempts, and the function-first bar-grasp regression requests it explicitly. Cheap reviews and existing direct `requirePhysicalUseCase` callers remain unchanged until the contract has broader corpus coverage.

Successful reviews expose a compact static-equilibrium certificate with the sampled actuator poses, residual wrench, contact forces and utilization, and required/allowed actuator torque. Agents should not have to infer success only from diagnostic silence.

## Alternatives

### Directional Capacity Sums

Rejected. Summing force magnitudes ignores moment balance and can combine mutually incompatible contact directions.

### Full MuJoCo Contact Simulation

Deferred. The existing MuJoCo probe checks articulated mechanism gravity/drop behavior, but abstract physical-use-case contacts are not collision constraints or actuator models. Building those correctly is a later dynamic-validation slice.

### External Linear-Programming Dependency

Deferred. The problem sizes are small and the repository already contains pure-TypeScript numerical helpers. A focused projected convex search plus independent certificate verification avoids adding a runtime dependency. A bounded Phase-I simplex remains a future replacement if the projected search produces unacceptable false negatives; it must preserve the same evidence and post-check contract.

## Test Strategy

1. RED: contacts are geometrically reachable and have enough summed force, but their wrench cannot balance the load moment.
2. RED: object equilibrium is feasible, but every feasible allocation exceeds a direct actuator torque limit.
3. GREEN: the same fixture passes after increasing actuator torque capacity.
4. GREEN: local contact normals are rotated into world space at the winning pose.
5. RED: common contact pose exists but `load.at` or `normalForceN` is missing.
6. Regression: unreachable contacts still produce reachability diagnostics without extra statics noise.
7. Regression: the function-first bar-grasp skeleton is evaluated by the new gate; if it fails, preserve the failure and repair the model or contract rather than weakening validation.
8. Regression: the rejected five-finger hand remains rejected.
