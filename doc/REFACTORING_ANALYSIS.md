# Refactoring Analysis: Flow & Architecture Gaps

## Scope
This document captures the architecture and flow issues discovered while debugging sketch placement, deletion corruption, and reload/persistence regressions.

It focuses on:
- code mutation flow
- history model and deletion logic
- keyboard event routing
- sketch plane/reference consistency
- context boundaries and execution lifecycle

See also: [CAD Engineering Standards](./CAD_ENGINEERING_STANDARDS.md) for target implementation standards.

---

## Executive Summary
The main systemic issue is **lack of a single transactional code mutation boundary**.

Code is currently changed through multiple pathways with different guarantees (AST mutation, editor text insertion, direct `setCode`), while downstream systems (history extraction, geometry execution, persistence) assume stable/valid code.

This mismatch creates brittle behavior in edge cases, especially around sketch history deletion and reload.

---

## Critical Findings

### F1. Multiple code mutation paths with inconsistent guarantees
- `CodeContext.insertCode` appends text directly.
- `useCodeInsertion` may use `InsertShapeCommand` (AST) or direct editor edits.
- Other flows call `setCode` directly.

Because these do not share one commit gate, invariants (parseability, return mapping, declaration consistency) can be violated.

Refs:
- `src/context/CodeContext.tsx`
- `src/hooks/useCodeInsertion.ts`
- `src/lib/ast.ts`

### F2. History model is regex-based, but deletion is destructive
History items come from line-based regex extraction (`extractVariables`), not from AST entity identity.
That model is then used to perform destructive delete operations, causing ambiguity for multiline or transformed declarations.

Refs:
- `src/lib/codeAnalysis.ts`
- `src/components/SceneBrowser.tsx`
- `src/components/Layout/SidePanel.tsx`
- `src/context/CodeContext.tsx`

### F3. Delete pipeline contains fallback heuristics instead of one deterministic command
Current delete tries multiple strategies and selects the first parseable result.
This is useful as a guardrail but indicates the primary command is not yet authoritative.

Refs:
- `src/context/CodeContext.tsx`
- `src/lib/ast.ts`

### F4. Keyboard Delete/Backspace routing intersects editor behavior
Global shortcuts were able to overlap with editor key handling in some states.
This can produce unexpected text edits while app-level delete also executes.

Refs:
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/Layout/WorkbenchLayout.tsx`

### F5. Sketch plane construction logic duplicated in multiple places
Plane/xDir derivation for face sketching exists in more than one component/hook.
This invites drift and inconsistent behavior.

Refs:
- `src/hooks/useFaceSelection.ts`
- `src/components/Toolbar.tsx`
- `src/components/Layout/WorkbenchLayout.tsx`

### F6. Geometry execution loop is not centrally parse-gated
`GeometryContext` executes code on debounce and handles errors reactively.
App-level persistence introduced parse gating, but execution remains largely optimistic.

Refs:
- `src/context/GeometryContext.tsx`
- `src/App.tsx`

---

## Root Cause Pattern
**Representation mismatch**:
1. UI history uses heuristic declaration extraction.
2. Core code mutation requires AST-precise semantics.
3. Execution/persistence assume validity.

When these representations diverge, bug fixes become local patches rather than durable system behavior.

---

## Target Architecture (Refactor Direction)

### 1) Introduce a single Code Transaction Boundary
All code writes go through one service:
- input: mutation intent/command
- process: AST transform
- validate: parse + structural constraints
- commit: `setCode`
- emit: mutation event metadata

No direct editor text mutations for modeling operations.

### 2) Replace regex history extraction with AST scene graph
Generate history items from AST with stable IDs:
- declaration ID
- node location
- dependencies
- operation kind

Use these IDs for selection, rename, delete, reorder (future).

### 3) Deterministic delete command (ID-based)
Delete by AST node identity, not by fuzzy name/line matching.
Fallback heuristics should be temporary safety only, not primary logic.

### 4) Unify sketch plane/reference service
Create one shared utility/service for:
- face -> plane conversion
- xDir derivation
- detached vs parametric sketch codegen rules

All entry points must call the same service.

### 5) Tighten keyboard routing contract
- global shortcuts in capture phase
- explicit scope rules (editor-focused vs canvas-focused vs dialogs)
- no dual handling for destructive keys

### 6) Execution + persistence validity contract
Use the same validity policy for:
- persistence save/load
- geometry execution trigger
- command commit acceptance

---

## Suggested Implementation Phases

### Phase A (Safety + Determinism)
- Add `CodeMutationService` and route delete/insert through it.
- Keep existing fallback paths behind a feature flag (`safetyFallback=true`).
- Add telemetry/logging for fallback usage.

### Phase B (History Model)
- Implement AST-backed `extractHistoryItems`.
- Migrate Scene Browser to AST history items.
- Remove line-regex dependency from deletion path.

### Phase C (Sketch Reference Unification)
- Build shared `SketchPlaneService`.
- Refactor `Toolbar`, `useFaceSelection`, and sketch completion to consume it.

### Phase D (Cleanup)
- Remove fallback heuristics after zero-fallback burn-in.
- Remove duplicate insertion pathways.
- Harden E2E around reload + autosave + delete flows.

---

## Regression Tests to Keep/Add
- delete sketch after reload with autosaved session
- delete multiline detached sketch declaration
- delete from keyboard while editor focused (must not corrupt text)
- face sketch commit remains stable after model recomputation
- invalid code must not be persisted

---

## Success Criteria
- One authoritative mutation pipeline for modeling code.
- History operations use AST identity, not text heuristics.
- No code corruption from delete in reload/autosave scenarios.
- Sketch placement logic comes from one service and is reproducible.
- Code revisions remain authoritative; model state is derived and only advances on successful execution.

---

## 2026 Determinism & Reliability Backlog

This backlog extends the refactor plan with concrete runtime determinism and failure-safety work.

### Priority P0 (Blocker)

#### P0.1 Worker init failure must be bounded and explicit
- Problem: init can hang indefinitely when worker returns init error.
- Action:
  - reject `initialize()` promise on `ERROR/init`
  - reject all pending requests on worker crash/protocol failure
  - add request timeout guard
- Refs:
  - `src/lib/geometryEngine.ts`
- Status: Completed (timeouts + init/crash/protocol rejection + diagnostics counters)

#### P0.2 Stale async results must never overwrite latest state
- Problem: Geometry results are applied without revision guard.
- Action:
  - add monotonic `revision`
  - commit state only when response matches latest revision
  - keep preview and committed channels isolated
- Refs:
  - `src/context/GeometryContext.tsx`
- Status: Completed (latest-revision-wins + stale-drop counters)

### Priority P1

#### P1.1 Single transactional mutation gateway
- Problem: code writes still occur via mixed pathways.
- Action:
  - add `CodeMutationService`
  - route insert/delete/rename through one AST-based commit path
  - deprecate direct modeling `setCode` writes
- Refs:
  - `src/context/CodeContext.tsx`
  - `src/hooks/useCodeInsertion.ts`
- Status: Completed for modeling flows (`FeatureContext` now mutation-boundary-only)

#### P1.2 Replace time-based IDs with deterministic IDs
- Problem: IDs based on `Date.now()` break reproducibility.
- Action:
  - use stable geometry fingerprint + deterministic sequence
  - remove timestamp usage from worker sketch IDs
- Refs:
  - `src/lib/worker.ts`
  - `src/context/CodeContext.tsx`
- Status: Completed

### Priority P2

#### P2.1 Harden persistence schema and migrations
- Problem: project validation is too permissive.
- Action:
  - strict schema validation for all persisted fields
  - explicit migration chain by version
  - reject unsupported versions with actionable error
- Refs:
  - `src/lib/projectService.ts`
- Status: Completed (strict schema + migration + version rejection)

#### P2.2 Feature registry determinism
- Problem: duplicate feature registration overwrites silently.
- Action:
  - fail fast in non-test runtime on duplicate `feature.id`
  - keep overwrite behavior test-only with explicit opt-in
- Refs:
  - `src/features/FeatureRegistry.ts`
- Status: Completed (fail-fast outside tests)

## Execution Order

1. P0.1 worker failure contract
2. P0.2 execution revision guard
3. P1.1 mutation gateway
4. P1.2 deterministic IDs
5. P2 persistence + registry hardening

## Test Matrix Additions

- `worker_init_error_rejects_and_recovers`
- `worker_crash_rejects_all_pending`
- `stale_preview_response_ignored`
- `stale_main_response_ignored`
- `same_code_produces_stable_sketch_ids`
- `invalid_project_payload_is_rejected`
- `duplicate_feature_registration_fails`
