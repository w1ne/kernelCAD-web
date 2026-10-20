# Studio Markup Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Studio users annotate a model, persist point measurements, and send or replay a versioned camera-and-markup snapshot with an agent prompt.

**Architecture:** A strict zod snapshot schema and small observable markup store own notes, measurements, topology refs, and the last camera pose. The existing viewer snapper and Measure tool produce model-space anchors; viewer overlays render saved records; the agent generation hook serializes a fresh snapshot into the submitted prompt. JSON load restores the saved records and camera through the viewer controller.

**Tech Stack:** React, React Three Fiber, Three.js, zod, Vitest, Playwright.

---

### Task 1: Snapshot contract and state

**Files:**
- Create: `src/studio/markup/markupSnapshot.ts`
- Create: `src/studio/markup/markupStore.ts`
- Test: `src/studio/markup/markupSnapshot.test.ts`

- [x] Define strict version 1 schemas and types for camera, generic face/edge topology refs, point/distance/diameter measurements, and anchored notes.
- [x] Add serializer, parser, measurement-value helper, and an observable store that captures, loads, and replays validated snapshots.
- [x] Enforce note and measurement item limits when adding records, surface overflow errors, and handle snapshot-save validation failures in the panel.
- [x] Test round-trip replay and known 3-4-5 distance measurement behavior.

### Task 2: Viewer markup and measurement overlays

**Files:**
- Modify: `src/studio/components/viewer/measure/edgePolylines.ts`
- Modify: `src/studio/components/viewer/measure/measureSnap.ts`
- Modify: `src/studio/components/viewer/measure/useViewerSnapper.ts`
- Modify: `src/studio/components/viewer/measure/MeasureTool.tsx`
- Create: `src/studio/components/viewer/markup/MarkupTool.tsx`
- Create: `src/studio/components/viewer/markup/MarkupLayer.tsx`
- Create: `src/studio/components/viewer/markup/MarkupPanel.tsx`
- Modify: `src/studio/components/Viewer.tsx`
- Modify: `src/studio/Viewport.tsx`
- Modify: `src/studio/StudioShell.tsx`
- Modify: `src/studio/ViewportToolbar.tsx`
- Test: focused store, overlay, and component tests under `src/studio/components/viewer/markup/`

- [x] Carry face/edge refs through snapping and record saved distance measurements from the existing Measure tool.
- [x] Add note placement mode, editable/removable notes and measurements, clear-all, and snapshot JSON load/export controls.
- [x] Render anchored note labels, saved dimensions, and restored topology selection using existing color tokens and overlays.
- [x] Capture camera state and apply a validated replay pose in the active viewer.

### Task 3: Agent handoff

**Files:**
- Modify: `src/studio/hooks/useAgentGeneration.ts`
- Modify: `src/studio/StudioGenerate.tsx`
- Test: `src/studio/StudioGenerate.test.tsx`

- [x] Capture the markup snapshot when a prompt is submitted and include its compact JSON in the actual generation request prompt.
- [x] Preserve the submitted snapshot with queued prompts, retries, and repairs.
- [x] Test that the prompt payload contains a parseable snapshot with the current camera, notes, measurements, and topology refs.

### Task 4: Documentation and browser workflow

**Files:**
- Create: `docs/guide/studio-markup-snapshot.md`
- Create: `docs/demos/studio-markup/README.md`
- Create: `docs/demos/studio-markup/demo.mp4`
- Create: `docs/demos/studio-markup/verification.json`
- Test: `tests/studio_markup_snapshot.spec.ts`
- Test: `tests/studio_markup_capture.spec.ts`

- [x] Document the version 1 JSON fields, units, validation, prompt attachment, and replay workflow.
- [x] Add Playwright flows covering snapshot load, rendered markup, JSON save, note placement, and measurement. The operator ran both specs on macOS with real Chromium on 2026-10-20; both passed in 19.1 seconds.
- [x] Record and inspect the local Studio workflow as MP4. The operator capture produced a 279,499-byte MP4; an extracted frame at 8 seconds shows the anchored note, 9.8 mm measurement, and picked face and edge refs.

### Task 5: Verification

- [x] Run the Studio Vitest suite and quality/site tests for the current worktree; current counts are recorded in `docs/demos/studio-markup/verification.json`.
- [x] Run the Studio Playwright snapshot and capture specs on the operator's Mac; this is local evidence for the revision immediately before `735d9ee`, not verification of later code or deployed behavior.
- [x] Run `npx tsc -b --noEmit` and ESLint on changed TypeScript files.
- [x] Inspect `git diff` and verify that no generated caches or reduced-detail geometry artifacts were added.
