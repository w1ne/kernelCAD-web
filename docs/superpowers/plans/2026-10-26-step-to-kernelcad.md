# STEP to KernelCAD Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-party `kernelcad import-step` command that converts STEP assemblies into editable KernelCAD assembly scripts backed by exact native BREP part assets and a provenance manifest.

**Architecture:** Read STEP with the repository-pinned OCCT WASM `STEPCAFControl_Reader`, traverse XCAF definitions and occurrences, and write each unique valid definition directly as OCCT BREP. Emit a flattened KernelCAD assembly script with rigid occurrence transforms, component colors, path-qualified names, and a JSON manifest; stage and publish the bundle as one directory.

**Tech Stack:** TypeScript, Commander, replicad-opencascadejs / OCCT XCAF, `lib.fromBREP`, Node filesystem APIs, SHA-256.

---

### Task 1: Add an OCCT XCAF STEP reader and validated assembly snapshot

**Files:**
- Create: `src/kernel/import/stepAssemblyImport.ts`
- Create: `src/kernel/import/stepAssemblyTypes.ts`
- Reference: `src/kernel/backends/occt/stepAssemblyExport.ts`
- Reference: `src/kernel/backends/occt/occtBackend.ts`

- [ ] Initialize the pinned OCCT runtime and write the source bytes to a unique OCCT virtual-filesystem path.
- [ ] Read and transfer with `STEPCAFControl_Reader`, enabling names and colors; own the reader, document handle, shape/color tool handles, temporary labels, and progress objects with the existing reverse-order cleanup pattern.
- [ ] Extend the pinned OCCT WASM binding with `KernelCAD_XCAF.GetName` and sparse `GetChildTags` helpers because generic GUID/attribute handles and contiguous label tags cannot be assumed in JavaScript; pin the rebuilt runtime rather than inferring names from STEP entity order.
- [ ] Traverse free-shape labels recursively. For each leaf occurrence, resolve its referred definition, compose parent and component locations, preserve the full source-label/name path, and apply SHUO instance color before occurrence-label and definition colors.
- [ ] Convert each composed `gp_Trsf` to a 3×4 matrix and reject reflections, scale, shear, non-finite values, or any matrix that is not a proper rigid transform.
- [ ] Deduplicate definitions by XCAF referred-label identity, preserve multiple solids in one definition compound, require at least one valid closed solid with no loose non-solid geometry, and collect per-definition bounds, volume, solid count, recognized source length-unit names, and validation results.
- [ ] Unlink the temporary OCCT virtual-file entry in `finally`; return only plain serializable records and BREP text/bytes, never live embind objects.

### Task 2: Emit deterministic BREP assets, script, and manifest as one bundle

**Files:**
- Create: `src/kernel/import/stepBundleWriter.ts`
- Modify: `src/kernel/import/stepAssemblyTypes.ts`

- [ ] Serialize every unique definition directly with `BRepToolsWrapper.Write`; derive stable asset IDs from the BREP bytes and retain the OCCT BREP header/version.
- [ ] Build deterministic script-safe names with collision suffixes while keeping original names and occurrence paths untouched in the manifest.
- [ ] Emit one `lib.fromBREP('./parts/<id>.brep')` per occurrence; add the extracted rotation and millimetre translation and source component color before adding it to the root `assembly()`.
- [ ] Emit `manifest.json` with schema version, input basename and SHA-256, source units, BREP version, definition statistics and validation, and every occurrence's source path, definition ID, placement, and effective color.
- [ ] Refuse an existing destination. Write all files into a private sibling staging directory, clean it on every failure, and publish only after all asset and metadata writes succeed.

### Task 3: Cache repeated native BREP loads

**Files:**
- Create: `src/modeling/parts/brepParseCache.ts`
- Modify: `src/modeling/parts/fromMeshFormats.ts`

- [ ] Add a SHA-256-keyed LRU capped at 32 master `OcctBackend` values; clone on each handback and dispose evicted masters.
- [ ] Register cache cleanup with `registerOcctResetHook`, following `src/modeling/parts/stepParseCache.ts` so reset never calls into a poisoned WASM heap.
- [ ] Route only `lib.fromBREP` parsing through the cache; keep file checks, path resolution, error remapping, metadata, and `lib.fromSTEP` behavior intact.

### Task 4: Register `kernelcad import-step`

**Files:**
- Create: `src/agent/cli/commands/importStep.ts`
- Modify: `src/agent/cli/index.ts`
- Modify: `README.md`

- [ ] Add `kernelcad import-step <input.step> --out <directory> [--name <assembly-name>] [--json]` with deterministic default naming and strict validation of paths and arguments.
- [ ] Return nonzero with a path-specific report for parse, empty, invalid/open, unsupported-transform, and write failures; with `--json`, emit a structured report without publishing partial output.
- [ ] Register the command and document STEP-to-KernelCAD translation, the generated bundle layout, and the static-assembly limits (no native SolidWorks/Parasolid parser, inferred mates, face colors, or feature history).

### Task 5: Build the CLI and exercise a real round-trip

**Files:**
- No new test files unless explicitly requested.

- [ ] Run the CLI TypeScript check and build using the repository's Node 22 / npm 10 toolchain.
- [ ] Run `kernelcad import-step` on a small STEP containing a named colored solid and on a representative assembly STEP when available; verify exact generated file set, manifest transforms/names/colors, and existing-destination refusal.
- [ ] Run `kernelcad parts <generated-script> --json` to confirm every emitted BREP loads into the existing KernelCAD evaluator and that part counts and measurements match the import report.
- [ ] Review `git diff --check`, the output-bundle layout, and the generated script and manifest before reporting completion.
