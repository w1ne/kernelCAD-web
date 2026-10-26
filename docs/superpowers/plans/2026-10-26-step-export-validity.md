# STEP Export Validity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply KernelCAD's existing B-rep and mesh validity checks to single-shape STEP exports.

**Architecture:** Factor the current Scene-part STEP check into a shared per-shape helper. Call it from both Scene and single-shape STEP dispatch, with the existing default-on `verify` option and write-then-diagnose behavior.

**Tech Stack:** TypeScript, OCCT WASM through Replicad, Vitest.

---

### Task 1: Prove single-shape STEP verification is missing

**Files:**
- Create: `src/agent/script-runtime/exportSingleStepValidity.test.ts`
- Read: `src/agent/script-runtime/export.ts`
- Read: `src/agent/script-runtime/exportPhases.ts`

- [x] **Step 1: Add the regression test first**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';

beforeAll(async () => { await initOcct(); });

describe('single-shape STEP validity', () => {
  it('reports a face-sharing compound while retaining STEP bytes', async () => {
    const result = await runAndExport({
      fileName: 'touching-compound.kcad.ts',
      format: 'step',
      code: `
        const arm = assembly('touching-compound');
        arm.part('left', box(10, 10, 10));
        arm.part('right', box(10, 10, 10).translate(10, 0, 0));
        return arm.model().toCompound();
      `,
    });

    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.diagnostics.map(d => d.code)).toContain('export.mesh.not-watertight');
  });
});
```

- [x] **Step 2: Run the focused test and confirm it fails for the missing diagnostic**

Run: `npx vitest run src/agent/script-runtime/exportSingleStepValidity.test.ts`

Expected before implementation: the export returns STEP bytes, but the diagnostics do not
contain `export.mesh.not-watertight`.

### Task 2: Share STEP verification with single-shape exports

**Files:**
- Modify: `src/agent/script-runtime/exportPhases.ts`
- Modify: `src/agent/script-runtime/export.ts`
- Modify: `src/agent/mcp/tools/exportModel.ts`
- Test: `src/agent/script-runtime/exportSingleStepValidity.test.ts`

- [x] **Step 1: Extract the per-shape check**

Add a `stepShapeVerifyFailure(shape, targetId, partName?)` helper beside
`firstStepVerifyFailure`. It returns `brepInvalidDiagnostic(targetId, partName)` when
`isValidShape(getOC(), shape.getReplicadShape().wrapped)` is false; otherwise it runs
`verifyWatertight(meshShapeForExport(shape.getReplicadShape()))` and returns
`stlNotWatertightDiagnostic(report, targetId, partName, 'STEP mesh')` if the report fails.
Have `firstStepVerifyFailure` call this helper once per Scene part.

- [x] **Step 2: Pass export options and target identity into the single-shape STEP handler**

Change the `exportSingleShape` STEP branch to pass `input` and `targetId` into
`exportSingleStep`. After STEP bytes are produced, run `stepShapeVerifyFailure` unless
`input.options?.format === 'step' && input.options.verify === false`. Return the bytes with the
failure appended to diagnostics, preserving the existing write-then-fail contract.

- [x] **Step 3: Update the option description**

Update the `ExportModelInput.no_verify` documentation in `src/agent/mcp/tools/exportModel.ts` to
say it skips the default STEP/STL validity checks. Preserve the typed STEP `verify` option and
the `no_verify` compatibility behavior.

- [x] **Step 4: Run the focused test**

Run: `npx vitest run src/agent/script-runtime/exportSingleStepValidity.test.ts`

Expected: the face-sharing compound test passes, with non-empty STEP bytes and the structured
mesh validity diagnostic.

### Task 3: Lock the override and healthy-path behavior

**Files:**
- Modify: `src/agent/script-runtime/exportSingleStepValidity.test.ts`

- [x] **Step 1: Add the valid box and explicit bypass assertions**

Add tests showing a single `box(10, 10, 10)` exports without `export.brep.invalid` or
`export.mesh.not-watertight`, and the face-sharing compound with
`options: { format: 'step', verify: false }` still returns bytes without either validity
diagnostic.

- [x] **Step 2: Run the focused test file**

Run: `npx vitest run src/agent/script-runtime/exportSingleStepValidity.test.ts`

Expected: all three tests pass.

- [x] **Step 3: Run the existing STEP export checks**

Run: `npx vitest run src/agent/script-runtime/exportSingleStepValidity.test.ts src/agent/script-runtime/connectorManifestExport.test.ts src/agent/mcp/tools/evaluateScript.step.test.ts src/agent/mcp/tools/export.test.ts`

Result: 40 tests passed, including Scene STEP behavior and export-tool routing.

### Task 4: Replay the six published failure artifacts through current STEP import/export

**Files:**
- Read: `/Volumes/LabWired/worktrees/kernelCAD-web/artifacts/cadgenbench-2026-10-26/kernelcad-submission.zip`
- Create outside the repository: `/Volumes/LabWired/worktrees/kernelCAD-web/artifacts/cadgenbench-2026-10-26/replay-six.ts`
- Create outside the repository: `/Volumes/LabWired/worktrees/kernelCAD-web/artifacts/cadgenbench-2026-10-26/fixtures/`

- [x] **Step 1: Extract only the six failed output STEP files**

Use Python's `zipfile.ZipFile.extract` for `123/output.step`, `137/output.step`,
`202/output.step`, `217/output.step`, `240/output.step`, and `250/output.step` into the external
artifact `fixtures` directory.

- [x] **Step 2: Replay each file through the current `runAndExport` path**

For each extracted input, call `runAndExport` with code
`return await lib.fromSTEP('<absolute fixture path>');`, format `step`, and the fixture directory
as `scriptDir`. Print the fixture id, output byte count, and diagnostic codes/messages. Preserve
the original file and write any replay output to the external artifact directory.

- [x] **Step 3: Compare the replay results with the official per-fixture reasons**

The HF report recorded non-manifold mesh edges for 123, 137, and 250 and
`BRepCheck_UnorientableShape` for 202, 217, and 240. After the current `lib.fromSTEP` import and
healing path, all six single-shape re-exports returned STEP bytes plus `export.brep.invalid`.
This catches all six as invalid on the replay path, but does not reproduce the three original
mesh-only classifications. Treat this as a diagnostic, not as a new benchmark score; the source
and re-imported shapes take different paths.

### Task 5: Final verification

**Files:**
- Review: `git diff --check`
- Review: `git status --short`

- [x] **Step 1: Run the targeted verification set**

Run: `npx vitest run src/agent/script-runtime/exportSingleStepValidity.test.ts src/agent/script-runtime/connectorManifestExport.test.ts src/agent/mcp/tools/evaluateScript.step.test.ts src/agent/mcp/tools/export.test.ts`

Result: 40 tests passed with exit code 0. `npm run typecheck` also passed.

- [x] **Step 2: Check patch hygiene**

Run: `git diff --check`

Result: no output and exit code 0. Focused ESLint reported zero errors and one existing
restricted-import warning in `exportPhases.ts` for its `replicad` import.

- [x] **Step 3: Review the final diff**

Confirm only the STEP validity helper/dispatch, its focused integration test, and this plan/design documentation changed.
