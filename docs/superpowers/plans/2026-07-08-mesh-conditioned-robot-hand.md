# Mesh-Conditioned Robot Hand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the robot hand example from manually scattered dimensions into a reference-landmark-driven parametric assembly with mechanical completion.

**Architecture:** Keep the prototype local to the hand example. Add a `referenceLandmarks` evidence object, generate the visible palm/finger/thumb/wrist details from it, and keep the existing clevis/mate/load validation path as the mechanical completion layer.

**Tech Stack:** KernelCAD `.kcad.ts` example script, Vitest integration tests, `evaluateAndBuildScript`.

---

### Task 1: Add Reference-Landmark Contract Test

**Files:**
- Modify: `tests/integration/examples/fiveFingerKinematicHand.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions to the existing front-facing silhouette test:

```ts
expect(source).toContain('const referenceLandmarks =');
expect(source).toContain('referenceLandmarks.fingers.forEach(addFinger)');
expect(source).toContain('referenceLandmarks.actuatorWindows');
expect(source).toContain('referenceLandmarks.tendons');
expect(source).toContain('referenceLandmarks.screws');
expect(source).toContain('angleDeg: 38');
expect(source).not.toMatch(/\[\s*\{ name: 'little'/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot`

Expected: FAIL because `referenceLandmarks` does not exist yet.

### Task 2: Move Visible Evidence Into `referenceLandmarks`

**Files:**
- Modify: `examples/robot-hand/five-finger-kinematic-hand.kcad.ts`

- [ ] **Step 1: Add the landmark object**

Create a top-level `referenceLandmarks` object holding palm dimensions, actuator windows, screws, tendons, and finger specs.

- [ ] **Step 2: Generate palm details from landmarks**

Replace hard-coded actuator-window, screw, and tendon loops with loops over
`referenceLandmarks.actuatorWindows`, `referenceLandmarks.screws`, and
`referenceLandmarks.tendons`.

- [ ] **Step 3: Generate fingers from landmarks**

Replace the inline finger spec array with `referenceLandmarks.fingers.forEach(addFinger)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot`

Expected: PASS, or a real KernelCAD evaluation failure to fix before continuing.

### Task 3: Verify Open/Closed Evaluation Directly

**Files:**
- No file changes.

- [ ] **Step 1: Run the integration test**

Run: `npm test -- tests/integration/examples/fiveFingerKinematicHand.test.ts --reporter=dot`

Expected: both open and closed pose evaluation assertions pass with zero error diagnostics.

- [ ] **Step 2: Inspect worktree diff**

Run: `git status --short` and `git diff -- examples/robot-hand/five-finger-kinematic-hand.kcad.ts tests/integration/examples/fiveFingerKinematicHand.test.ts docs/superpowers/specs/2026-07-08-mesh-conditioned-robot-hand-design.md docs/superpowers/plans/2026-07-08-mesh-conditioned-robot-hand.md`

Expected: only the prototype files changed.
