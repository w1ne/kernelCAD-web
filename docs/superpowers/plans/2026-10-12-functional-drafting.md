# Functional Drafting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking. Do not pause for another implementation approval; the user approved this scope.

**Goal:** Report declared critical-dimension coverage and explicit engineering decisions, integrate them into reviewed export, and publish worked examples with real demos.

**Architecture:** Shared pure review contracts/validation/evaluation feed a shape-bound virtual declaration and finalized SVG/PDF report. Studio consumes that report and records source-bound decisions; ordinary PDF download stays available. Examples and two articles use the actual runtime and UI.

**Tech Stack:** TypeScript, existing feature-capture/runtime/OCCT pipeline, React/Zod/Vitest, native Markdown blog builder, existing Chrome/CDP capture and FFmpeg.

## Task 1: Contracts, capture and authoritative runtime report

**Files:** new `src/shared/intent/drawingReview.ts` and focused validation/evaluation modules/tests; `drawingGdtRecord.ts`; capture `proxy.ts`, `captureSession.ts`, `authoringFeatureRecords.ts`; feature-kind/virtual-lowerer definitions; `runtime/drawingDeclarations.ts`; `viewerDimensions/drawingAnnotation.ts`; SVG/PDF option contracts; `drawingAuto/contracts.ts`; `exportSvgDrawing.ts`; `script-runtime/exportDrawing.ts`.

- [x] Add failing tests for a missing declared bore callout, including source-only capture.

```ts
const plan = { id: 'plate', requirements: [{ id: 'bore-size', featureId: 'centreBore',
  annotationId: 'authored:bore-size', expectedKind: 'diameter' as const,
  role: 'critical' as const, reason: 'Communicate the nominal interface size.' }], decisions: [] };
// A report with no matching annotation must be incomplete, even with zero overlaps.
```

- [x] Implement the contract from the design with strict structural validation, namespaced decision keys, source/option plan merging and exact-ID coverage over final rows. Use `label-overridden` for critical computed-label replacement. Keep each module focused to preserve the quality ratchet.
- [x] Add the virtual shape declaration and validated optional dimension IDs, retain them through conversion, and collect only plans upstream of the exported target.
- [x] Forward `reviewPlans`, `decisionResolutions`, `requireCompleteReview` through printable SVG/PDF conversion. Evaluate after final layout/suppression. Gate strict exports on a declared complete report; ordinary exports retain the report and actionable diagnostics.
- [x] Exercise the actual source declaration:

```ts
return box(100, 70, 12)
  .hole('top', { u: 0, v: 0, diameter: 30, depth: 'through', name: 'centreBore' })
  .dimension({ id: 'bore-size', kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [50, 35, 12] } })
  .drawingReview({ id: 'plate', requirements: [{ id: 'bore-size', featureId: 'centreBore',
    annotationId: 'authored:bore-size', expectedKind: 'diameter', role: 'critical',
    reason: 'Communicate the nominal interface size.' }], decisions: [] });
```

- [x] Run targeted Vitest coverage for the new shared module, capture, runtime collection and drawing exports; include SVG/PDF equality and source-only transport fixtures. Run applicable typechecks. Record actual command outputs, then commit Task1.
- [x] Specification review, address findings, then code-quality review and address findings before the next implementation task.

## Task 2: Source-bound Studio decision review

**Files:** new `src/studio/components/FunctionalDrawingReviewPanel.tsx`, `useFunctionalDrawingReview.ts` and tests; existing `useDraftingReview.ts`, `DraftingReview.tsx`, `DraftingReviewPanels.tsx`; authoring/Studio drafting settings, persistence and transport tests.

- [x] Add failing UI tests for an incomplete declared report blocking advanced review while ordinary Download PDF still works. Use authoritative fixture rows, not text-derived expectations.
- [x] Add the compact report panel, requirement-to-annotation selection and note/provenance decision editor. Persist source-bound resolutions; keep them outside saved profile presets. Reset confirmations when engineering criteria change.
- [x] Include effective decisions in preview options. Gate Mark reviewed and reviewed PDF on current complete declared report/no stale overrides. The reviewed request sets `requireCompleteReview: true`; normal PDF requests omit it. Defend event handlers as well as disabled buttons.
- [x] Run focused Studio/settings/persistence/transport suites, including source/profile/datums/strategy invalidation, change-then-revert and late-response cases. Keep current one-click regressions green. Record outputs and commit Task2.
- [x] Specification review, corrections, then quality review and corrections.

## Task 3: Proper examples, two articles and actual MP4 demos

**Files:** `examples/functional-drafting/` named sources, generator and README; `docs/guide/functional-drafting.md`, `docs/guide/drawing-decisions.md`; `docs/demos/functional-drafting/` evidence/metadata; blog builder discoveries and generated `site/blog/` targets.

- [x] Read bundled CAD entry/authoring/drawing skills. Reuse source geometry and author stable dimensions against actual edges/points; record the illustrative brief and required scope. Do not claim catalog fits or load acceptance.
- [x] Generate passing, missing/hidden and unresolved/resolved cases through the actual export API, with fixed date/revision. Assert one connected valid solid and expected dimensions/hole geometry separately from report assertions. Save source, options, SVG/PDF, PNG/report and hashes.
- [x] Write two native articles with problem, source declaration, annotated outcomes, review actions, limits and downloadable artifacts. Keep existing one-click article intact. Use the established frontmatter/build/discovery patterns.
- [x] Capture actual coverage and decision workflows in the existing browser (inspect/attach first, fixed lifetime/idle timeout). Retain meaningful HTTP/report evidence and screenshots; produce two readable short MP4s with FFmpeg. Inspect representative frames and video metadata, decode the files and verify the resulting PDF. Stop owned helpers/tabs and preserve Chrome.
- [x] Build named blog targets using `npm run site:build-blog`. Run blog/content/link checks; inspect desktop/mobile pages and video playback locally. Commit Task3, then specification and quality review.

## Task 4: Integration, protected merge and real publication

**Files:** public source/docs/assets above; private server `vendor/kernelcad` pin and any required forwarding regression tests; task ledger/release receipts.

- [ ] Run final focused regression bundle, public typechecks/lint/build/quality ratchets and complete required CI. Review the final diff; do not increase baseline allowances.
- [ ] Push the exact public head to a feature PR against develop. Compare local/remote heads, wait for required checks, and merge normally. Record the merge commit and app deployment result.
- [ ] In the clean isolated server worktree, pin `vendor/kernelcad` to that exact merged public commit. Confirm new options survive sync review and async PDF transport, run applicable integration tests/typecheck and required CI, then merge. Do not merge a temporary/pre-merge vendor pin.
- [ ] Deploy the backend using the current runbook/workflow, require exact-commit `/healthz` and actual preview/strict export proof. Capture live Studio unresolved-to-resolved review and PDF export; preserve source/receipt and clean owned temporary state.
- [ ] Use the correct marketing deployment owner and exact public commit. Read back article HTML and every published demo asset; verify desktop/mobile, navigation, downloads and MP4 playback. Do not dispatch duplicate deployments once proof agrees.
- [ ] Update ledger after each milestone with exact PR/SHA/CI/deployment/browser receipts, remaining limits and next step. Mark complete only when publication and live product gates pass; physical acceptance remains outside this illustrative task.
