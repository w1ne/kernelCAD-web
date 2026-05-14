# Mechanical Intent Contracts V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let kernelCAD scripts declare physical joint intent so `review_cad` can reject agent-built mechanisms whose actuator, shaft, support, or output link is missing from the real mate graph.

**Architecture:** Add `Assembly.mechanicalJoint(name, opts)` as a lightweight metadata contract over existing parts and mates. A new mate-layer reviewer consumes those contracts and emits deterministic `assembly.mechanical.intent.*` diagnostics, which flow through the existing `review_cad` diagnostics, `fitness.blockingReasons`, and repair prompt path.

**Tech Stack:** TypeScript, Vitest, existing `Assembly`, mate records, `review_cad`, and `mechanismFitness`.

---

### Task 1: Capture Mechanical Intent Records

**Files:**
- Modify: `src/capture/assembly.ts`
- Test: `tests/unit/assemblies/assemblyCapture.test.ts`

- [ ] Add `MechanicalJointIntentRecord` and `MechanicalJointIntentOpts`.
- [ ] Add `Assembly.mechanicalJoint(name, opts): this`.
- [ ] Validate required string fields and duplicate names.
- [ ] Add `Assembly.__mechanicalJointIntents()`.
- [ ] Test capture, duplicate-name rejection, and invalid empty fields.

### Task 2: Review Mechanical Intent

**Files:**
- Create: `src/lib/mates/mechanicalIntent.ts`
- Test: `tests/integration/mcp/reviewCad.test.ts`

- [ ] Add diagnostics for missing mate, non-revolute mate, missing referenced part, actuator not mounted by any fastened mate, shaft not on axis connector, support missing, and output not connected to the declared mate.
- [ ] Keep v1 checks deterministic and cheap: use mate records, connector refs, and part names; do not add force/torque math yet.
- [ ] Test a valid declared joint returns `ok: true`.
- [ ] Test a contract with a floating actuator returns `assembly.mechanical.intent.actuator-not-mounted`.

### Task 3: Wire Review Loop

**Files:**
- Modify: `src/mcp/tools/reviewCad.ts`
- Modify: `src/lib/mates/mechanismFitness.ts`
- Test: `tests/integration/mcp/reviewCad.test.ts`

- [ ] Run `reviewMechanicalIntent(arm)` inside `review_cad`.
- [ ] Include intent diagnostics in `diagnostics`, `fitness.blockingReasons`, and `suggestedRepairPrompt`.
- [ ] Include `mechanicalIntentIssueCount` in `fitness.mechanismSummary` when non-zero.

### Task 4: Advertise Agent API

**Files:**
- Modify: `src/mcp/tools/listApi.ts`
- Test: existing list API drift tests indirectly cover global drift; update descriptive assembly text.

- [ ] Update the `assembly` global description to mention `.mechanicalJoint(...)`.

### Task 5: Verify

**Commands:**
- `npm test -- tests/unit/assemblies/assemblyCapture.test.ts tests/integration/mcp/reviewCad.test.ts`
- `npm test -- tests/integration/examples/desktop3axisMates.test.ts`
- `npm run typecheck`
