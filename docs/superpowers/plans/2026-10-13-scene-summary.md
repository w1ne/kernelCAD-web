# Compact MCP scene summary implementation plan

**Goal:** Include validity, volume, BREP face count and bounding size in MCP build receipts.

**Architecture:** Summarize the lowered returned root, never the last helper feature. Read existing backend geometry without changing backend/registry APIs. Assembly totals sum part volumes/faces (overlap counted per part) and use world-frame bounds. Failed or capture-only evaluations explicitly report unavailable geometry. Share the summary across evaluation, source-edit, export and preview receipts; preserve all existing diagnostics.

**Tech stack:** TypeScript, Vitest, existing geometry backend accessors.

- [x] Add integration tests for a returned box followed by a helper, boolean cut, translated assembly, dry run, failed script and source edit. Run `npx vitest run tests/integration/mcp/sceneSummary.test.ts` and confirm missing-summary failures.
- [x] Implement `src/agent/script-runtime/sceneSummary.ts`, wire full and dry evaluation and propagate through source edits. Use existing backend accessors and dispose temporary world-frame clones.
- [x] Carry summaries from export and preview build phases without rebuilding scripts; update output schemas and MCP authoring documentation.
- [x] Run MCP tests, `npm run typecheck`, CLI typecheck and `npm run lint`. Review diff for scope and kernel/UI exclusions.
- [x] Validate actual local MCP calls; generated media, evidence and recording helpers removed during PR review.
- [ ] Commit, push the current feature branch and open a PR against develop with tests, no UI layout change and “Do not merge without Andrii”. Do not merge or deploy.
