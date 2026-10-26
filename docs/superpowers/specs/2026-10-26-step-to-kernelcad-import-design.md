# STEP to KernelCAD Assembly Import Design

## Goal

Add a first-party `kernelcad import-step` command that turns a STEP assembly into a portable KernelCAD project: editable `.kcad.ts` source, exact solid geometry as STEP part assets, and a machine-readable import manifest. CAD applications may remain the upstream readers for SolidWorks or Parasolid; KernelCAD owns the STEP-to-KernelCAD translation.

## Scope and boundaries

The importer accepts ISO-10303-21 STEP files containing 3D solids. It reads product definitions and occurrences with OCCT's XCAF STEP reader, including assembly paths, occurrence placements, product names, and component colors. The generated project uses KernelCAD's existing `lib.fromSTEP` and `Assembly` APIs.

This is a static assembly import. It does not infer mates, joints, motion, feature history, or manufacturing intent. The generated scene has one root assembly with one KernelCAD part per STEP occurrence. Original nested paths remain in the manifest and in path-qualified part names; this records the source hierarchy without claiming that KernelCAD's current flattened `subAssembly` API provides nested solver semantics. Component-level colors are in scope; face-level colors are not.

Native `.sldprt`, `.sldasm`, and Parasolid parsing is out of scope. Mesh conversion is not used. Open, invalid, or non-solid bodies are reported as errors; the default import is all-or-nothing and does not silently omit geometry or repair invalid source bodies.

## Architecture

1. Initialize the same pinned OCCT WASM runtime used by KernelCAD. Read STEP into a `TDocStd_Document` with `STEPCAFControl_Reader`, enabling names and colors. The existing `src/kernel/backends/occt/stepAssemblyExport.ts` demonstrates the project's XCAF ownership and lifetime pattern for assembly documents and the matching STEP writer.
2. Traverse XCAF free-shape labels recursively. Convert geometry and placements to KernelCAD's canonical millimetres exactly once, and record the source units. For each component occurrence, record its source product path, referenced definition, composed rigid transform, and effective component color. Deduplicate geometry by referenced XCAF definition, not by display name or approximate bounding box.
3. Validate each unique definition before writing. Require at least one valid closed solid; preserve multiple solids within a component as one compound part. Refuse unsupported non-rigid placement transforms and invalid/open geometry with a report identifying the source path.
4. Write each unique component definition as a STEP solid asset using OCCT's exact BRep transfer. Do not mesh or simplify it. Emit `lib.fromSTEP` calls for each occurrence, applying its rigid transform and color before adding it to the root KernelCAD assembly. Group generated occurrences by definition so the existing content-addressed STEP cache can reuse part parses while every occurrence gets a separate captured shape.
5. Write outputs to a staging directory and atomically publish the bundle. The destination must not already exist; never overwrite or merge into an existing path.

## Command and bundle

Command shape:

```text
kernelcad import-step <input.step> --out <directory> [--name <assembly-name>] [--json]
```

The output directory contains:

```text
<assembly-name>.kcad.ts
manifest.json
parts/<definition-id>.step
```

The generated script uses relative asset paths and returns a KernelCAD root assembly scene. Part identifiers and script-safe names are deterministic and collision-safe. Original source names and full component paths remain unmodified in `manifest.json`.

The manifest records its schema version, input filename and SHA-256, source length units, unique definitions, occurrence paths, placements in millimetres, effective colors, output asset paths, and per-definition solid counts, bounds, volumes, and validation results. It distinguishes fatal errors from non-fatal metadata omissions. KernelCAD's existing importer may normalize same-domain topology during STEP loading; geometry remains exact BRep rather than tessellated mesh, but original face IDs and native feature history are not promised.

## Error behavior

Malformed or unsupported STEP, an empty document, invalid/open solids, unsupported placements, failed asset writes, or failed deterministic name disambiguation cause a non-zero command result. No partial bundle is published. With `--json`, the command emits a structured failure report; otherwise it prints a concise error and the affected component path. Missing names receive deterministic generated names and are recorded as metadata warnings.

The command is local CLI functionality. It does not change the existing single-shape `lib.fromSTEP(path)` contract or the existing MCP `import_step` tool, and it adds no server, browser, or commercial behavior.

## Acceptance criteria

- A single-part STEP produces one asset and a `.kcad.ts` model that evaluates through the existing KernelCAD import path.
- A fixture with nested product definitions, repeated occurrences, non-identity rotations/translations, names, colors, and non-default length units produces the expected paths, placements, colors, and unique-part count.
- The generated model's world-space bounds and per-component solid/volume summaries agree with the source import within the STEP transfer and KernelCAD tolerance policy; no component may disappear silently.
- Invalid/open and empty fixtures fail with a path-specific report and leave no partial bundle.
- A large assembly export from SolidWorks or another upstream CAD application can be imported without adding a native-format parser. Roboto-01 is an end-to-end target when a complete assembly STEP is available; per-part-only STEP coverage is not evidence that the complete robot assembly was imported.

## Implementation locations

The implementation is expected to add a focused XCAF reader/traversal module under `src/kernel/import/`, a bundle/script emitter beside it, and a CLI command registered through `src/agent/cli/index.ts`. The legacy `src/lib/parts/fromSTEP.ts` path stays compatible and is reused by generated projects. The existing XCAF writer in `src/kernel/backends/occt/stepAssemblyExport.ts` is the reference for safe WASM object ownership; it should not be replaced.
