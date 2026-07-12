# Five-Finger Topology Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic topology/connectivity gate that rejects robot hands with disconnected moving links, unsupported revolute axes, missing limits, or invalid connector contracts before any visual iteration is accepted.

**Architecture:** Add a pure `reviewJointTopology(assembly)` reviewer under `src/modeling/mates/`, wire its diagnostics into `review_cad`, then preserve them through `design_loop`. The gate uses existing assembly surfaces: `__parts()`, `__mates()`, `__mechanicalJointIntents()`, and `__physicalUseCases()`.

**Tech Stack:** TypeScript, Vitest, KernelCAD Assembly/Mate APIs, existing `review_cad` and `design_loop`.

---

## File Structure

- Create `src/modeling/mates/jointTopology.ts`
  - Pure deterministic reviewer for part graph connectivity and non-fastened mate contracts.
- Create `src/modeling/mates/jointTopology.test.ts`
  - Fast unit tests using small in-memory assemblies.
- Modify `src/agent/mcp/tools/reviewCad.ts`
  - Include topology diagnostics in review diagnostics and fitness summary inputs.
- Modify `src/modeling/mates/mechanismFitness.ts`
  - Accept topology diagnostics as blocking reasons.
- Modify `tests/integration/mcp/physicalUseCaseGate.test.ts`
  - Add `review_cad` integration for topology failures and passing clean fixture.
- Modify `tests/integration/mcp/designLoop.test.ts`
  - Add design-loop prompt preservation for topology diagnostics.
- Modify `tests/integration/examples/fiveFingerKinematicHand.test.ts`
  - Add regression proving current five-finger hand fails topology/connectivity before geometry redesign is accepted.

---

### Task 1: Pure Topology Reviewer

**Files:**
- Create: `src/modeling/mates/jointTopology.ts`
- Create: `src/modeling/mates/jointTopology.test.ts`

- [x] **Step 1: Write failing tests**

Create tests for:

- `assembly.connectivity.floating-moving-part` when a moving link is isolated from physical-use-case stable parts.
- `assembly.joint-topology.missing-limit` when a revolute mate has no `limitsDeg`.
- `assembly.joint-topology.unsupported-axis` when a revolute mate has no mechanical support intent.
- clean supported hinge passes with stable root, finite limits, and `mechanicalJoint(...)`.

- [x] **Step 2: Verify red**

Run:

```bash
npx vitest run src/modeling/mates/jointTopology.test.ts --reporter=dot
```

Expected: FAIL because `jointTopology.ts` does not exist.

- [x] **Step 3: Implement reviewer**

Create `reviewJointTopology(arm)` with:

- graph nodes from `arm.__parts()`;
- graph edges from every mate whose refs parse and whose parts exist;
- stable roots from `arm.__physicalUseCases().flatMap(useCase => useCase.stableParts)`, plus explicit `palm-root`, `palm`, `base`, `root` fallback when present;
- moving parts from all non-fastened mate endpoints;
- non-fastened mate contract checks:
  - connector exists;
  - connector origin must be numeric `vec3`;
  - revolute/cylindrical/pin_slot connector axes must be finite non-zero vectors;
  - revolute/cylindrical/pin_slot require finite `limitsDeg`;
  - prismatic requires finite `limitsMm`;
  - revolute requires a `mechanicalJoint` intent whose `mate` equals the mate name.

- [x] **Step 4: Verify green**

Run:

```bash
npx vitest run src/modeling/mates/jointTopology.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/modeling/mates/jointTopology.ts src/modeling/mates/jointTopology.test.ts
git commit -m "feat: review joint topology"
```

---

### Task 2: Wire Topology Into Review And Design Loop

**Files:**
- Modify: `src/agent/mcp/tools/reviewCad.ts`
- Modify: `src/modeling/mates/mechanismFitness.ts`
- Modify: `tests/integration/mcp/physicalUseCaseGate.test.ts`
- Modify: `tests/integration/mcp/designLoop.test.ts`

- [x] **Step 1: Write integration tests**

Add tests proving:

- `review_cad` returns `assembly.joint-topology.unsupported-axis` for a revolute mate with finite limits but no support intent.
- `review_cad` returns `assembly.connectivity.floating-moving-part` for an articulated load part with no stable-root path.
- `design_loop` includes topology diagnostics in `reviewFacts` and `nextActionPrompt`.

- [x] **Step 2: Verify red**

Run:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/mcp/designLoop.test.ts --reporter=dot
```

Expected: FAIL on missing topology diagnostics in review output.

- [x] **Step 3: Wire reviewer**

- Import `reviewJointTopology` and its diagnostic type in `reviewCad.ts`.
- Add topology diagnostics to the review diagnostic list before physical-use-case reachability diagnostics.
- Include topology diagnostics in `summarizeMechanismFitness(...)`.
- Extend `MechanismFitnessResult` inputs to treat topology diagnostics as blocking reasons.
- Ensure repair prompt generation includes topology diagnostics through the existing diagnostic list path.

- [x] **Step 4: Verify green**

Run:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/mcp/designLoop.test.ts tests/unit/mcp/designLoopNextActionPrompt.test.ts --reporter=dot
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/agent/mcp/tools/reviewCad.ts src/modeling/mates/mechanismFitness.ts tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/mcp/designLoop.test.ts
git commit -m "feat: gate reviews on joint topology"
```

---

### Task 3: Five-Finger Hand Regression

**Files:**
- Modify: `tests/integration/examples/fiveFingerKinematicHand.test.ts`

- [x] **Step 1: Write current-hand regression**

Add a test that evaluates `examples/robot-hand/five-finger-kinematic-hand.kcad.ts`, extracts `front-facing-five-finger-robot-hand`, runs `reviewJointTopology(assembly)`, and asserts at least one blocking topology diagnostic is present.

- [x] **Step 2: Verify red or diagnostic behavior**

Run:

```bash
npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts -t "topology" --reporter=dot
```

Expected: PASS if current hand has topology failures; FAIL if the current hand is topologically clean, in which case add a `review_cad` assertion that the hand still fails reachability and record that topology is not the current first blocker.

- [x] **Step 3: Tighten only the gate, not geometry**

Do not edit `examples/robot-hand/five-finger-kinematic-hand.kcad.ts` in this task. If the current hand passes topology, leave it passing topology and preserve reachability as the current blocker.

- [x] **Step 4: Commit**

```bash
git add tests/integration/examples/fiveFingerKinematicHand.test.ts
git commit -m "test: check hand topology gate"
```

---

## Final Verification

- [ ] Run topology unit tests:

```bash
npx vitest run src/modeling/mates/jointTopology.test.ts --reporter=dot
```

- [ ] Run review/design-loop integration:

```bash
npx vitest run tests/integration/mcp/physicalUseCaseGate.test.ts tests/integration/mcp/designLoop.test.ts tests/unit/mcp/designLoopNextActionPrompt.test.ts --reporter=dot
```

- [ ] Run hand integration:

```bash
npx vitest run tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot
```

- [ ] Run typecheck:

```bash
npm run typecheck
```

- [ ] Run final review.
