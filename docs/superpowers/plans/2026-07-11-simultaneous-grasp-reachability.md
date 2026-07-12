# Simultaneous Grasp Reachability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject a multi-contact physical use case unless one targeted actuator sample satisfies every declared contact at once.

**Architecture:** Extend the existing reachability issue type with a use-case-level simultaneous-contact variant. Evaluate a complete contact-distance vector for each solved pose, preserve existing per-contact minima, and emit the simultaneous variant only when all contacts are individually reachable but no common pose passes.

**Tech Stack:** TypeScript, Vitest, KernelCAD assembly mate solver.

---

### Task 1: Add the common-pose reachability gate

**Files:**
- Modify: `src/modeling/mates/physicalUseCaseReachability.test.ts`
- Modify: `src/modeling/mates/physicalUseCaseReachability.ts`
- Modify: `src/modeling/mates/physicalUseCase.ts`
- Modify: `src/agent/mcp/tools/designLoop.ts`
- Modify: `src/agent/mcp/toolRegistry.ts`
- Test: `tests/integration/mcp/designLoop.test.ts`
- Test: `tests/integration/examples/functionFirstBarGraspSkeleton.test.ts`
- Test: `tests/integration/examples/fiveFingerKinematicHand.test.ts`

- [x] **Step 1: Write the failing counterexample test**

Add a base with a revolute `yaw` mate, two colocated moving contact connectors at `[10, 0, 0]`, and fixed targets at `[10, 0, 0]` and `[0, 10, 0]`. Sample `[0, 90]` degrees. Assert that `reviewPhysicalUseCaseReachability(...)` returns one issue with:

```ts
{
  kind: 'simultaneous-contacts-unreachable',
  useCaseName: 'split-pose-grasp',
  toleranceMm: 0.1,
  bestMaxDistanceMm: expect.any(Number),
  contactDistances: expect.arrayContaining([
    expect.objectContaining({ contactA: 'finger.a', contactB: 'base.target-a' }),
    expect.objectContaining({ contactA: 'finger.b', contactB: 'base.target-b' }),
  ]),
}
```

- [x] **Step 2: Run the new test and verify RED**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseReachability.test.ts -t "rejects contacts that are reachable only at different actuator poses" --reporter=dot
```

Expected: FAIL because the current implementation returns `[]` after independently minimizing both contacts.

- [x] **Step 3: Add a discriminated simultaneous-contact issue**

In `physicalUseCaseReachability.ts`, preserve the current contact issue fields and add:

```ts
export interface PhysicalUseCaseSimultaneousContactsReachabilityIssue {
  readonly kind: 'simultaneous-contacts-unreachable';
  readonly useCaseName: string;
  readonly toleranceMm: number;
  readonly bestMaxDistanceMm?: number;
  readonly contactDistances: readonly {
    readonly contactA: string;
    readonly contactB: string;
    readonly distanceMm?: number;
  }[];
}
```

Preserve the existing exported `PhysicalUseCaseReachabilityIssue` interface and introduce `PhysicalUseCaseReachabilityFinding` as the union of that interface and the new shape.

- [x] **Step 4: Implement common-pose evaluation**

For each solved sample, calculate every contact distance in one array. Update independent minima exactly as today. Only complete arrays are common-pose candidates. Track the candidate with the smallest maximum contact distance and whether any complete candidate has every distance `<= toleranceMm`.

After sampling:

```ts
const contactIssues = /* existing unreachable/uncheckable contacts */;
if (contactIssues.length > 0 || useCase.contacts.length < 2 || hasPassingCommonPose) {
  return contactIssues;
}
return [{
  kind: 'simultaneous-contacts-unreachable',
  useCaseName: useCase.name,
  toleranceMm,
  ...(bestCommonPose === undefined ? {} : { bestMaxDistanceMm: bestCommonPose.maxDistanceMm }),
  contactDistances: useCase.contacts.map(/* distances from best common pose when available */),
}];
```

- [x] **Step 5: Verify the focused test is GREEN**

Run the Step 2 command. Expected: PASS.

- [x] **Step 6: Wire the blocking diagnostic**

Add `PhysicalUseCaseSimultaneousContactsUnreachableDiagnostic` to the `PhysicalUseCaseDiagnostic` union in `physicalUseCase.ts` with code `assembly.physical-use-case.simultaneous-contacts-unreachable`. In `reviewPhysicalUseCasesWithReachability(...)`, discriminate the new issue and emit a use-case-level error. Keep the existing per-contact mapping unchanged.

- [x] **Step 7: Add diagnostic and design-loop integration coverage**

Extend an adjacent `physicalUseCase` test to call `reviewPhysicalUseCasesWithReachability(...)` and assert the new code, use-case name, tolerance, and contact-distance evidence are surfaced as a blocking error. Add a `designLoopTool(...)` regression that requires the code and repair hint in `reviewFacts` and `nextActionPrompt`. Update the `review_cad` tool description to state that all contacts must pass in the same sampled actuator pose.

- [x] **Step 8: Run focused reachability coverage**

Run:

```bash
npx vitest run src/modeling/mates/physicalUseCaseReachability.test.ts src/modeling/mates/physicalUseCase.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 9: Run hand regressions**

Run:

```bash
npx vitest run tests/integration/examples/functionFirstBarGraspSkeleton.test.ts tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot
```

Expected: the bar-grasp skeleton passes and the five-finger regression remains intentionally rejected by its asserted diagnostics.

- [x] **Step 10: Check types and whitespace**

Run the repository TypeScript check if defined in `package.json`, then run:

```bash
git diff --check
```

Expected: exit 0.
