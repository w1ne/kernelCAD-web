# GLB Rig Pivots Implementation Plan

> **For agentic workers:** Inline execution in the current `feat/glb-rig-pivots` worktree. Tasks use checkbox syntax for tracking.

**Goal:** Export assembly mates as a glTF node hierarchy with correctly placed pivots and `asset.extras.kernelcad.rig` metadata, while preserving flat exports.

**Architecture:** Carry the mate graph and resolved connector frames from assembly lowering through the internal SceneBackend. Build a renderer-independent spanning-tree description from the solved part transforms, convert those nodes into three.js groups only in the GLB writer, and include rig metadata/warnings in the asset extras and export diagnostics. Keep all geometry from kernelCAD's native examples and original geometry.

**Tech Stack:** TypeScript, Vitest, existing `Transform` SE(3) math, three-stdlib GLTFExporter, glTF-Transform, ffmpeg for a compact evidence demo.

---

### Task 1: Pure rig tree and math tests

**Files:**
- Create: `src/kernel/export/rigHierarchy.ts`
- Create: `src/kernel/export/rigHierarchy.test.ts`

- [x] Test hinge pivot coordinates/90° far-corner motion, prismatic range, grounded spanning tree, loop-closing `closed:true`, and unsupported ball/planar warnings.
- [x] Run the new test and confirm it fails because the builder is missing.
- [x] Implement a pure-data rig tree with deterministic local frames and documented unit conversions.
- [x] Run focused tests and refactor only while green.

### Task 2: Preserve solved mate inputs at export boundary

**Files:**
- Modify: `src/kernel/backends/sceneBackend.ts`
- Modify: `src/modeling/backends/occt/lowerers/assembly.ts`
- Modify: `src/kernel/backends/occt/sceneToWorldFrame.ts`
- Test: existing assembly lowerer coverage plus pure rig tests.

- [x] Extend internal scene contracts with optional resolved mates/connectors/grounded part.
- [x] Retain resolved connector frames for model() and solvedModel() without resolving topology twice.
- [x] Include each part's world transform in its world-frame export record.
- [x] Run focused assembly tests/typecheck.

### Task 3: Write GLB hierarchy and rig extras

**Files:**
- Modify: `src/kernel/backends/occt/exportGlb.ts`
- Modify: `src/agent/script-runtime/exportPhases.ts`
- Test: `tests/unit/kernel/backends/occt/exportGlb.test.ts`

- [x] Add a failing GLB round-trip test for a rigged hinge, default rig hierarchy, explicit flat mode, and `asset.extras.kernelcad.rig`.
- [x] Run the focused test and confirm red.
- [x] Build glTF groups with local matrices, inverse-offset world-baked meshes, and level-aligned pivot axes; embed rig metadata/warnings.
- [x] Surface loop and unsupported mate warnings as export diagnostics; keep flat output unchanged.
- [x] Run focused GLB and assembly tests.

### Task 4: Public docs and reproducible demo/evidence

**Files:**
- Modify: `docs/guide/import--export.md` (or its source equivalent identified during implementation)
- Create: `docs/demos/glb-rig/` demo source, invocation, output, and README
- Create: `/Volumes/LabWired/kc-work/logs/pr5-evidence.md`
- Private: dated comparison note in `kernelCAD-private` if available.

- [x] Document rig node names, supported mate types, ranges/units, flat override, and limitations.
- [x] Generate and inspect a short MP4 using an original kernelCAD hinge assembly and the exported GLB.
- [x] Record provenance, verification evidence, and deployment/public-page status truthfully.

### Task 5: Verify, commit, push, and open PR

- [x] Run focused suite under 60 seconds plus typecheck/lint as appropriate.
- [ ] Commit on `feat/glb-rig-pivots`, push, open a PR against `develop`, and capture the PR number/full SHA.
- [ ] Complete evidence file with test duration, commit/PR, demo inspection, and limitations.

> The source/docs branch is not deployed here: the requested workflow explicitly forbids merging. Verify the updated public docs page after the PR is merged and deployed.
