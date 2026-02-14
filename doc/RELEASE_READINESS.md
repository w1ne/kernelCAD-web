# Release Readiness Gate (Public V1)

**Date:** 2026-02-14  
**Current Verdict:** ⚠️ NOT READY (Final CI dry-run still pending)  
**Release Rule:** Only ship when every `P0` checkbox is complete and evidence is attached.

## Exit Criteria

- [ ] All `P0` items complete
- [x] `npm run qc:full` passes on release branch
- [ ] Required CI checks (`qc`, `e2e`, `build`) are green
- [ ] No unresolved `P0` known issues in release notes

## P0 Blockers (Must Fix Before Public Launch)

### P0-1 Reliability Regression Matrix
Owner: `@unassigned`  
Status: ☑ Complete

Required tests:
- [x] `worker_init_error_rejects_and_recovers`
- [x] `worker_crash_rejects_all_pending`
- [x] `stale_preview_response_ignored`
- [x] `stale_main_response_ignored`
- [x] `history_delete_with_editor_focus_does_not_corrupt_code`
- [x] `autosave_reload_delete_history_sketch_stable`

Pass criteria:
- [x] All above tests exist and are deterministic in CI
- [x] No flaky retry allowances for these cases

Evidence:
- Unit tests:
  - `src/lib/geometryEngine.test.ts`
  - `src/context/GeometryContext.test.tsx`
- E2E tests:
  - `tests/keyboard_shortcuts.spec.ts`
- Playwright config:
  - `playwright.config.ts` (`retries: 0`)
- CI run: `TBD`

### P0-2 Worker Isolation (Main vs Preview)
Owner: `@unassigned`  
Status: ☑ Complete

Requirements:
- [x] Preview execution no longer shares blocking queue with main execution
- [x] Main execution latency does not block hover/preview feedback path

Pass criteria:
- [x] Two independent execution channels or workers implemented
- [x] E2E stress test proves preview remains responsive during heavy main operation

Evidence:
- Implementation:
  - `src/lib/geometryEngine.ts` (channel-scoped singleton instances)
  - `src/context/GeometryContext.tsx` (main/preview engines separated)
- Stress test:
  - `src/context/GeometryContext.test.tsx` (`keeps preview responsive while main execution is still blocked`)
  - `tests/worker_isolation.spec.ts` (`preview remains responsive while main worker is blocked`)

### P0-3 SafeSketcher Advanced Curve Hardening
Owner: `@unassigned`  
Status: ☑ Complete

Requirements:
- [x] Explicit wrappers/guards for advanced curves (`bezier`, `spline`)
- [x] Failure behavior is deterministic (no worker crash / no silent corruption)

Pass criteria:
- [x] Unit tests cover valid and invalid advanced curve inputs
- [x] Worker remains alive and returns explicit error metadata on invalid curve operations

Evidence:
- Test file(s):
  - `src/lib/safeSketch.test.ts`
  - `src/lib/workerError.test.ts`
  - `src/lib/geometryEngine.test.ts` (`continue processing after SAFE_SKETCH_VALIDATION`)

### P0-4 Selection Identity Consistency (ID-Native)
Owner: `@unassigned`  
Status: ☑ Complete

Requirements:
- [x] Scene history uses stable IDs only (selection, hover, delete)
- [x] Viewer object selection path is ID-native for solids/sketches/planes
- [x] No remaining compatibility shims that map name -> id at runtime for core flows

Pass criteria:
- [x] Integration + E2E tests verify keyboard/context-menu delete with focused editor
- [x] No text corruption regressions (`const` -> `onst`) in tested paths

Evidence:
- Core files:
  - `src/components/Viewer.tsx`
  - `src/components/viewer/entities/ShapeGeometry.tsx`
  - `src/components/viewer/entities/SketchLine.tsx`
  - `src/components/viewer/overlays/SelectionOutline.tsx`
  - `src/lib/codeAnalysis.ts`
  - `src/lib/sketchNaming.ts`
- Tests:
  - `tests/keyboard_shortcuts.spec.ts`
  - `src/integration/ui_workflows.test.tsx`

### P0-5 Release CI Gate Enforcement
Owner: `@unassigned`  
Status: ☑ In Progress

Requirements:
- [x] Branch protection requires `qc`, `e2e`, and `build`
- [x] Release branch template/checklist enforced

Pass criteria:
- [x] Cannot merge release candidate without required checks
- [ ] Dry-run release on `release/*` branch succeeds

Evidence:
- GitHub branch protection (develop): `https://github.com/w1ne/kernelCAD/settings/branches`
- GitHub ruleset (release gate): `https://github.com/w1ne/kernelCAD/rules/12789133`
- Template/checklist:
  - `.github/PULL_REQUEST_TEMPLATE/release.md`
  - `.github/workflows/release-template-check.yml`
- Dry run PR: `TBD`
- Local gate evidence:
  - `npm run qc:full` passed on 2026-02-14 (lint + typecheck + vitest + playwright 72/72 + build)

## P1 (Should Ship Soon After Public Launch)

- [ ] Remove high-risk `as any` hotspots in worker/viewer critical paths
- [ ] Complete Sketch state synchronization TODOs in selection/workbench state
- [ ] Add abort/cancel semantics for `// @ai:` long-running operations
- [ ] Add user-facing crash recovery UX polish and diagnostics export

## Verification Commands

Run before every release candidate:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Or single gate:

```bash
npm run qc:full
```

## Release Decision Log

| Date | Decision | Reason | By |
|---|---|---|---|
| 2026-02-13 | NO-GO | P0 blockers open | Team |
| 2026-02-14 | HOLD | `qc:full` green; awaiting release/* dry-run proof for P0-5 | Team |

## Notes

- Public launch is blocked until all `P0` items are checked with evidence.
- Use this file as the single source of truth for go/no-go.
