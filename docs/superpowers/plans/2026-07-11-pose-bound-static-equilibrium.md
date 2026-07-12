# Pose-Bound Static Equilibrium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Certify that one sampled common-contact pose can balance the declared held-object wrench inside contact friction/capacity and actuator torque limits.

**Architecture:** Refactor targeted reachability to retain reusable solved pose witnesses. A new statics module converts each witness into a conservative eight-edge friction-pyramid feasibility problem, searches contact forces with projected gradient, independently verifies candidate certificates, and computes actuator torque through finite-difference relative-contact Jacobians with coupling expansion.

**Tech Stack:** TypeScript, Vitest, KernelCAD mate solver and SE(3) transforms, pure-TypeScript numerical helpers.

---

### Task 1: Add explicit statics evidence fields

**Files:**
- Modify: `src/modeling/mates/physicalUseCase.ts`
- Modify: `src/modeling/mates/physicalUseCase.test.ts`

- [ ] **Step 1: Write failing deep-copy and validation tests**

Extend the record test with:

```ts
loads: [{ part: 'object', at: 'object.com', force: [0, 0, -4] }],
contacts: [{
  a: 'finger.tip',
  b: 'object.contact',
  normal: [0, -1, 0],
  normalFrame: 'b',
  friction: 0.6,
  normalForceN: 8,
}],
criteria: {
  maxSlipMm: 1,
  maxForceResidualN: 0.01,
  maxTorqueResidualNmm: 0.1,
},
```

Add invalid-value cases for unsupported normal frames, non-positive residual tolerances, and attempts to loosen the numerical defaults.

- [ ] **Step 2: Run RED**

```bash
npx vitest run src/modeling/mates/physicalUseCase.test.ts --reporter=dot
```

Expected: FAIL because the fields are not represented or validated.

- [ ] **Step 3: Implement schema and copy behavior**

Add optional `load.at`, `contact.normalFrame: 'world' | 'a' | 'b'`, and the two positive residual criteria. Omitted normal frames remain semantically world-space without materializing a new property. Residual criteria may tighten but never exceed the built-in defaults.

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 2: Retain shared solved pose witnesses

**Files:**
- Modify: `src/modeling/mates/physicalUseCaseReachability.ts`
- Modify: `src/modeling/mates/physicalUseCaseReachability.test.ts`

- [ ] **Step 1: Write a failing witness test**

For the existing split-pose fixture, call a wished-for `assessPhysicalUseCaseReachability(...)`. Assert two solved witnesses with expanded poses and world endpoint distances while findings still contain the simultaneous-contact failure. For the valid common-pose fixture, assert `commonPoseSamples` contains the sample satisfying every contact.

- [ ] **Step 2: Run RED**

```bash
npx vitest run src/modeling/mates/physicalUseCaseReachability.test.ts --reporter=dot
```

Expected: FAIL because the assessment API does not exist.

- [ ] **Step 3: Implement collection and compatibility wrapper**

Add:

```ts
export interface PhysicalUseCaseSolvedContact {
  readonly contactA: string;
  readonly contactB: string;
  readonly pointA: Vec3;
  readonly pointB: Vec3;
  readonly distanceMm: number;
}

export interface PhysicalUseCasePoseWitness {
  readonly poses: NumericPoses;
  readonly transforms: ReadonlyMap<string, Transform>;
  readonly contacts: readonly PhysicalUseCaseSolvedContact[];
  readonly complete: boolean;
  readonly maxDistanceMm?: number;
}
```

`assessPhysicalUseCaseReachability(...)` builds samples once, solves each once, computes findings, and returns complete in-tolerance samples as `commonPoseSamples`. Keep `reviewPhysicalUseCaseReachability(...)` as a wrapper returning only findings.

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: PASS with existing reachability behavior unchanged.

---

### Task 3: Add held-object wrench feasibility

**Files:**
- Create: `src/modeling/mates/physicalUseCaseStatics.ts`
- Create: `src/modeling/mates/physicalUseCaseStatics.test.ts`

- [ ] **Step 1: Write failing statics tests**

Use real assemblies and pose witnesses for:

```text
1. common pose + missing load.at -> static-input-incomplete
2. force balance possible but contact offset leaves an unbalanced moment -> static-equilibrium-unmet
3. two symmetric contacts balance a vertical held-object load -> certificate
4. normalFrame on a rotated endpoint resolves to the expected world normal -> certificate
```

The symmetric fixture has one held part, contacts at x=-10/+10 mm, normal caps 8 N, friction 0.5, and a 6 N downward load at its center.

- [ ] **Step 2: Run RED**

```bash
npx vitest run src/modeling/mates/physicalUseCaseStatics.test.ts --reporter=dot
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement input resolution**

Require exactly one held load part, load application connectors on that part, one held endpoint per contact, numeric connector origins, finite transforms, `normalForceN`, supported normal frames, and finite positive tolerances. Unsupported evidence returns input-incomplete.

- [ ] **Step 4: Implement friction search**

Construct eight conservative generators per contact. Assemble six held-part wrench rows about the first load point. Minimize normalized residual while projecting each contact group onto:

```text
lambda[k] >= 0
sum(lambda[k]) <= normalForceN
```

Use deterministic ordering, a bounded iteration count, and a step bounded by the matrix Frobenius norm.

- [ ] **Step 5: Independently verify candidates**

Reconstruct forces and verify the true circular friction inequality, normal cap, force residual, and moment residual. Only verified data becomes a `PhysicalUseCaseStaticCertificate`; otherwise emit static-equilibrium-unmet with best residual evidence.

- [ ] **Step 6: Run GREEN**

Run the Step 2 command. Expected: PASS.

---

### Task 4: Add finite-difference actuator torque constraints

**Files:**
- Modify: `src/modeling/mates/physicalUseCaseStatics.ts`
- Modify: `src/modeling/mates/physicalUseCaseStatics.test.ts`

- [ ] **Step 1: Write failing low/high torque tests**

Create a one-axis finger contacting a held target at a 10 mm lever arm. The held-object equilibrium requires 1 N. Assert a 5 Nmm actuator limit fails with `static-actuator-torque-insufficient`, while 20 Nmm produces a certificate.

- [ ] **Step 2: Run RED**

Run the Task 3 test command. Expected: low-torque fixture incorrectly passes or lacks the actuator diagnostic.

- [ ] **Step 3: Implement relative-contact Jacobians**

For each revolute actuator:

1. Perturb the source pose by `1e-4 rad` in degrees.
2. Stay inside limits using central or inward one-sided differences.
3. Re-expand couplings and solve.
4. Differentiate mechanism-endpoint minus held-endpoint world displacement.
5. Compute ideal generalized torque with `J^T f`.

Missing limits, unsupported mates, failed perturbations, independent contact-path mates without actuator limits, coupled mates without transmission intent, or contradictory coupling/transmission ratios return input-incomplete.

- [ ] **Step 4: Add actuator constraints and post-check**

Run a contact-only search first. If it certifies equilibrium, rerun with squared actuator-limit violation penalties. Independently verify every absolute torque limit before issuing a certificate.

- [ ] **Step 5: Run GREEN**

Run the Task 3 test command. Expected: both low/high torque fixtures pass their assertions.

---

### Task 5: Wire diagnostics, review tooling, and design loop

**Files:**
- Modify: `src/modeling/mates/physicalUseCase.ts`
- Modify: `src/agent/mcp/tools/reviewCad.ts`
- Modify: `src/agent/mcp/toolRegistry.ts`
- Modify: `src/agent/mcp/tools/designLoop.ts`
- Modify: `tests/integration/mcp/physicalUseCaseGate.test.ts`
- Modify: `tests/integration/mcp/designLoop.test.ts`

- [ ] **Step 1: Write failing integration tests**

Add input-incomplete, unbalanced-wrench, low-torque, and high-torque cases using `includePhysicalUseCaseStatics: true`. Assert diagnostics, fitness blockers, repair prompts, and certificate evidence.

- [ ] **Step 2: Run RED**

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts -t "static equilibrium|static actuator" --reporter=dot
```

Expected: FAIL because the option and diagnostics are not wired.

- [ ] **Step 3: Extend physical-use-case review**

Add typed diagnostics:

```text
assembly.physical-use-case.static-input-incomplete
assembly.physical-use-case.static-equilibrium-unmet
assembly.physical-use-case.static-actuator-torque-insufficient
```

When reachability has no findings, pass its exact common-pose samples to statics and return successful certificates.

- [ ] **Step 4: Wire review_cad and registry**

Add `includePhysicalUseCaseStatics?: boolean` and expose certificates on output. Document sampled, linearized, opt-in static certification.

- [ ] **Step 5: Preserve failures in design_loop**

Physical-acceptance attempts enable statics. Preserve all statics codes in review facts and repair prompts. Add a focused regression.

- [ ] **Step 6: Run GREEN**

Run Task 5 focused coverage and the full `designLoop.test.ts`. Expected: PASS.

---

### Task 6: Exercise the function-first hand and verify

**Files:**
- Modify: `examples/robot-hand/function-first-bar-grasp-skeleton.kcad.ts`
- Modify: `tests/integration/examples/functionFirstBarGraspSkeleton.test.ts`
- Test: `tests/integration/examples/fiveFingerKinematicHand.test.ts`

- [ ] **Step 1: Add explicit bar load evidence**

Add `target-bar.load-point` at the bar center, set the load's `at`, request statics in the regression, and assert a certificate for `bar-grasp`.

- [ ] **Step 2: Run the bar regression**

```bash
npx vitest run tests/integration/examples/functionFirstBarGraspSkeleton.test.ts --reporter=dot
```

If it fails equilibrium, retain the failure and inspect the contact layout/forces. Do not change tolerances or capacities solely to obtain green.

- [ ] **Step 3: Run hand regressions**

```bash
npx vitest run tests/integration/examples/functionFirstBarGraspSkeleton.test.ts tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot
```

Expected: the bar skeleton provides a certificate or exposes a concrete blocker; the old five-finger hand remains rejected.

- [ ] **Step 4: Run focused and static verification**

```bash
npx vitest run src/modeling/mates/physicalUseCaseReachability.test.ts src/modeling/mates/physicalUseCaseStatics.test.ts src/modeling/mates/physicalUseCase.test.ts tests/integration/mcp/designLoop.test.ts --reporter=dot
npm run typecheck
npx eslint src/modeling/mates/physicalUseCaseReachability.ts src/modeling/mates/physicalUseCaseStatics.ts src/modeling/mates/physicalUseCaseStatics.test.ts src/modeling/mates/physicalUseCase.ts src/agent/mcp/tools/reviewCad.ts src/agent/mcp/tools/designLoop.ts src/agent/mcp/toolRegistry.ts
git diff --check
```

Expected: all commands exit 0. Existing route-generator warnings may remain during typecheck, but no TypeScript errors are allowed.
