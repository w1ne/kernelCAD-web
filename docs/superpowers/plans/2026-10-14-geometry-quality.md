# Geometry Quality Implementation Plan

> Execute inline using executing-plans; the user authorized autonomous implementation and an existing isolated worktree.

**Goal:** Expose tiny-face, short-edge and sampled mirror-symmetry checks through verify.
**Architecture:** Reuse script evaluation and root selection; model runtime measures existing BREP APIs. Extend the existing packed triangle BVH for distance queries.
**Tech Stack:** TypeScript, existing Replicad/OCCT, Vitest. No new dependencies.

- [x] Add focused failing closest-point tests to tests/unit/dfm/meshBvhClosestPoint.test.ts. Run `npx vitest run tests/unit/dfm/meshBvhClosestPoint.test.ts`; expect missing closestPoint. Implement point-triangle distance and BVH nearest traversal; rerun along with meshBvh.test.ts.
- [x] Add failing real-BREP tests to src/agent/mcp/tools/checkGeometryQuality.test.ts for step-face area, short edges, bracket reflection, asserted-plane failure, rotated inertia candidates, return-vs-tail and input rejection. Run that suite before implementing.
- [x] Implement options/results in src/modeling/runtime/geometryQualityTypes.ts, measurement in geometryQuality.ts and sampled checks in geometrySymmetry.ts. Add the MCP adapter checkGeometryQuality.ts using existing evaluation/root resolution. Route geometry-quality in verify.ts and extend its registry input/output schema; preserve tool ordering.
- [x] Add router/schema coverage, regenerate only verify in tests/fixtures/mcp/toolRegistry.publicContract.json using live TOOLS definitions, preserving existing scene schema reference. Search schema revisions and update if applicable.
- [x] Update kernelcad-mcp skill discovery and docs/guide/geometry-quality.md; retain example source/invocation/check outputs in docs/demos/geometry-quality. Generate a readable MP4 of actual local checker invocation and results; inspect representative frames and retain evidence/provenance.
- [x] Run `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit -p tsconfig.cli.json`, changed-file ESLint, focused geometry/BVH/DFM/verify/registry/contract suites. Review diff and scope. Commit conventionally, push only feat/check-geometry-tiny-face-short-edge-symmetry and report SHA, files/check results/licenses/UI.
