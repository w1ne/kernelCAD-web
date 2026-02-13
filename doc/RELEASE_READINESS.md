# Release Readiness Assessment

**Date:** 2026-02-13
**Status:** ⚠️ **NOT READY FOR RELEASE**

## Executive Summary

While significant architectural improvements (Reliability Layer, AST-based mutations, Persistence Schema) have been implemented, the platform currently lacks the rigorous testing and runtime isolation required for a public release.

The "Dealbreakers" listed below represent risks of data loss, application hangs, or user frustration that must be addressed before V1.0.

## 🚨 Dealbreakers (Must Fix)

### 1. Missing Reliability Regression Suite
The `doc/REFACTORING_ANALYSIS.md` lists critical regression tests that are **currently missing from the codebase**:
- `worker_init_error_rejects_and_recovers`
- `worker_crash_rejects_all_pending`
- `stale_preview_response_ignored`
- `stale_main_response_ignored`

**Risk**: We have implemented the *fixes* (timeouts, revision guards) in `GeometryEngine` and `GeometryContext`, but we have **zero automated verification** that they actually work. A regression here means the app hangs indefinitely or corrupts user data.

### 2. Single Thread Bottleneck (UX Blocker)
Both "Main Execution" (compiling the model) and "Live Preview" (hovering over shapes) share the **same Web Worker and Message Queue**.
- **Scenario**: User makes a complex boolean operation (takes 2s). While waiting, they move the mouse.
- **Result**: The UI freezes or lags because preview requests are queued behind the heavy computation.
- **Requirement**: Separate `PreviewWorker` and `MainWorker` are needed to keep the UI responsive.

### 3. Incomplete "SafeSketcher" Wrappers
The `SafeSketcher` class proxies many methods but does not explicitly wrap advanced curves with safety logic (e.g., `bezier`, `spline`).
- **Risk**: Users scripting these curves might trigger internal OpenCASCADE crashes that are not caught by our safety layer, potentially crashing the worker hard.

### 4. Codebase & Documentation Drift
The documentation claims certain refactors are "Completed" (e.g., Phase 4 Observability `[~]`), but the code shows they are either partial or missing specific implementation details (like the missing tests).

## ✅ Ready / Strong Points

- **Persistence**: Project saving/loading is robust, using `zod` schemas and version migration (v1.0 -> v1.1).
- **Code Mutation**: The switch to AST-based mutations (`CodeContext`, `codeAnalysis`) prevents syntax errors during UI interactions.
- **Core Engine**: The `GeometryEngine` class structure is solid, with built-in diagnostics and timeout handling.

## Recommended Action Plan

1.  **Implement the Missing Test Matrix**: Create `src/features/core/reliability.test.ts` and implement the missing regression tests.
2.  **Split the Worker**: Refactor `GeometryEngine` to manage a pool (or at least 2 workers: Main & Preview).
3.  **Harden SafeLayer**:
    -   Explicitly wrap `bezier` and `spline` in `SafeSketcher`.
    -   Reduce `as any` usage in `worker.ts` and `Viewer.tsx` to prevent silent geometric failures.
4.  **Refactor Monolithic Viewer**: Extract `CameraHandler`, `InteractionHandler`, and `ConsolidatedShape` into separate files. `Viewer.tsx` is currently too high-risk for maintenance.
5.  **Fix State Synchronization**: Complete the `TODO` in `SelectionContext` to ensure the UI is always in sync with the actual sketch object from the workbench state.
6.  **Feature Freeze**: Focus on stability and architectural cleanup before v1.0.

## Pass 2: Technical Debt & Architectural Risks

### 1. Monolithic 3D Core (`Viewer.tsx`)
The 3D viewport component is over 800 lines and handles mixed concerns: Three.js initialization, meshing logic, camera animations, and parametric entity dragging.
- **Risk**: High maintenance cost and frequent regressions in 3D interaction.

### 2. Type "Opacity" (`as any`)
Over 60 instances of `as any` exist, particularly in the critical geometry worker. 
- **Risk**: OpenCASCADE internal errors (like code 1) are often caught too late or lead to "undefined is not a function" in the main thread due to loose typing.

### 3. Sketch State Desync
`SelectionContext` contains a `TODO` for looking up the active sketch object. 
- **Risk**: The UI "Sketch Mode" might operate on a stale reference or fail to update when the underlying code changes, especially during undo/redo operations.

### 4. Magic Comment Fragility
The `// @ai:` magic comment system in `CodeContext` is powerful but lacks an "Abort" controller or robust error recovery if the worker or LLM fails mid-stream.
- **Risk**: Potential for infinite "AI processing..." comments or code corruption if the user keeps typing while the AI is responding.

