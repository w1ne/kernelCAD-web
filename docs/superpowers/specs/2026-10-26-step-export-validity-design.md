# STEP Export Validity Design

## Context

`exportSceneBackend` checks STEP exports for each scene part with the existing B-rep analyzer
and export-mesh watertight check. `exportSingleStep` currently writes a STEP file without those
checks. Single-shape and `Scene.toCompound()` outputs therefore have a weaker validity contract
than ordinary assembly Scene exports.

The published CAD benchmark report contains two relevant failure classes: B-rep analyzer
failures such as `BRepCheck_UnorientableShape`, and meshes where an edge is shared by four
triangles after tessellation and vertex welding. The current codebase already has checks for
both classes; this change makes the single-shape STEP path use them too.

## Design

Factor the per-shape STEP verification into one helper in
`src/agent/script-runtime/exportPhases.ts`. The helper will run `isValidShape` first, return an
`export.brep.invalid` diagnostic on failure, then run `meshShapeForExport` plus
`verifyWatertight` and return the existing `export.mesh.not-watertight` diagnostic on failure.
The Scene path will call that helper for each named part; the single-shape path will call it for
the exported shape.

STEP verification remains on by default. `options: { format: 'step', verify: false }` bypasses
the checks, matching the existing Scene export control. The exporter continues to return and
write the generated STEP bytes even when verification fails, so the artifact remains available
for inspection while the structured diagnostic marks the call unsuccessful.

This change adds diagnosis at export time. It does not change geometry, perform automatic
healing, or claim exact parity with an external benchmark's tessellator.

## Acceptance

- A valid box single-shape STEP export has no new validity error.
- A single-shape compound with two exactly touching box solids returns STEP bytes and an
  `export.mesh.not-watertight` or `export.brep.invalid` diagnostic.
- Setting `verify: false` suppresses those validity diagnostics while preserving STEP output.
- Scene exports retain the same per-part checks and diagnostics.
- A follow-up replay of the six published STEP files records whether current import healing and
  these export checks catch each failure class; it does not rewrite the published artifacts.
