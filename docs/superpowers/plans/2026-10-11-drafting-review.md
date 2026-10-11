# Editable drafting implementation plan

> **For agentic workers:** use superpowers:subagent-driven-development, test-driven-development and verification-before-completion. The user explicitly requested subagents.

**Goal:** Deliver editable manufacturing drawings, dimensioning styles and reusable profiles with reproducible examples and a detailed public drafting article.

**Architecture:** Extend the existing OCCT drawing pipeline and its JSON export contract.
Use runtime-light shared types for engine and Studio. Preview and final export use the
same options. Persist source-scoped review settings, not a second CAD source of truth.

**Tech stack:** TypeScript, React, Zod, Vitest, OCCT, vector SVG/PDF, static website HTML.

## Ownership and ordered integration

1. Engine agent owns `src/shared/intent/drafting.ts`, `drawingAuto/*`, drawing renderer,
   script-runtime drawing options/wiring and relevant engine/export tests.
2. Studio agent owns `src/studio/*`, projectService schema/persistence, local Vite export
   endpoint and relevant UI/transport tests. It consumes the shared engine contract.
3. Examples/site agent owns `examples/drafting-review/*`, guide/post pages, generated
   previews/downloads, blog index, sitemap and docs-page integration.
4. Root owns private server endpoint/runtime integration, source skills corrections,
   site landing links, dependency setup, commits, reviews, PRs and deployment reconciliation.

### Engine

- [x] Write failing behavior tests for semantic annotation IDs, overrides, style geometry
  and profile precedence. Run `node_modules/.bin/vitest run src/kernel/backends/occt/draftingReview.test.ts`.
- [x] Add shared profile/override types and built-in presets. Preserve absent-option behavior.
- [x] Emit IDs/report metadata and apply overrides with missing-ID diagnostics. Keep
  suppressed rows in the report while excluding them from visible counts.
- [x] Build chain and verified symmetry dimensions in `drawingAuto/collectPhases.ts`.
- [x] Forward the options through SVG/PDF, CLI and MCP. Run the drawing test bundle.

### Studio and export transport

- [x] Add failing tests in `exportViaServer.test.ts`, projectService tests and a new
  DrawingReview panel test covering preview, edits, saved settings and source changes.
- [x] Extend preview transport with SVG JSON results and options forwarding; keep ordinary
  PDF/download behavior compatible. Support drawing formats in the local endpoint.
- [x] Add the review panel and reusable profile controls. Wire saved options into toolbar,
  palette and Export tab PDF actions. Disable stale results after source/profile changes.
- [ ] Run UI/transport/persistence tests and inspect the actual review interface.

### Examples and documentation

- [x] Read bundled authoring/drawing skills and write explicit dimensions and datum intent
  for the plate and bearing mount before creating `.kcad.ts` sources.
- [x] Add a generator using `runAndExport`; produce baseline/chain/symmetry sheets and a
  reviewed bearing-mount sheet with fixed dates and revisions.
- [x] Validate model dimensions and export reports, then inspect PNG sheets and 3D views.
- [x] Write the source guide and full post, include editable sources, SVG/PDF downloads,
  explained choices, runnable commands, before/after edits and honest acceptance limits.
- [x] Add website/docs navigation and verify built page links/assets.

### Server, review and release

- [x] In a clean private-server worktree, add failing export tests for preview JSON and
  drawing options before adapting its endpoint and worker transport.
- [x] Review public work for spec compliance, then code quality; resolve all material issues.
- [x] Run focused tests, lint, typecheck/build and source-driven example generation.
- [ ] Commit/push public work, create PR, verify CI and merge within user-authorized scope.
- [ ] Update the private vendor pin to the exact merged public commit; verify server tests
  and its build, review/merge its PR and use the existing deployment owner.
- [ ] Deploy app and marketing through their existing workflows. Check the public article,
  documentation, downloads and hosted preview/export behavior. Reuse existing Chrome;
  give owned attachment helpers fixed lifetime and idle timeout, then stop them.

## Local verification recorded

Final focused public run: 116 tests across 13 suites passed. Full lint passed with
existing unused-disable warnings; production app and CLI builds and final typecheck
passed. Model evaluations emitted no diagnostics. Example B-rep validity, connected
solid count and envelopes passed; SVG/PDF reports agree and all four worked sheets
have zero reported overlaps. Independent specification and quality reviews found
view, tolerance-text and restored-preference issues, which were fixed and rechecked.
Hosted route/worker transport: 34 focused tests and server typecheck passed.
Exact vendor integration and production deployment remain release steps below.
