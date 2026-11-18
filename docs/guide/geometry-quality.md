# Check tiny faces, short edges and mirror symmetry

Run the MCP `verify` tool on a single solid body:

```json
{
  "check": "geometry-quality",
  "file": "part.kcad.ts",
  "tiny_face_area_mm2": 0.01,
  "tiny_face_relative": 0.00001,
  "short_edge_length_mm": 0.1,
  "symmetry_tolerance_mm": 0.05,
  "asserted_plane": { "origin": [0, 0, 0], "normal": [1, 0, 0] }
}
```

Use `code` instead of `file` for inline source. The checker measures the script's
returned body; `feature_id` selects a captured body explicitly, including a leaf
body in an assembly. An assembly scene, empty shape, shell or multi-solid target
cannot pass as a single body. Invalid source/options and failed measurements
return `ok: false` with an error.

Tiny faces have BREP area strictly below the larger of the absolute threshold
and `tiny_face_relative * total BREP surface area`. The relative value is a
fraction in [0,1], so 0.00001 means 0.001% of the body's surface area. Short
edges have BREP length strictly below `short_edge_length_mm`. Defaults are
0.01 mm², relative 0 and 0.1 mm. Set a topology threshold to zero to disable it.
Numerical BREP integration can differ slightly from a nominal dimension's
closed-form area at a threshold boundary.

The report contains `tinyFaces` and `shortEdges`, each with `id`, `index`,
`location`, and measured `areaMm2` or `lengthMm`. Ids enumerate the selected
feature's BREP for this rebuild; they are not stable `@kc[...]` references or
viewer mesh indices. Face locations use BREP face centers, which can fall
outside a trimmed face; edge locations are parametric midpoints. All locations,
plane origins and witnesses are in the selected body's model coordinate frame.
`thresholds` reports the effective thresholds and total surface area.
`degenerateEdges` separately lists explicit BREP degenerated edges such as sphere
poles, with bounding-box centers. They are parameterization artifacts and do not
fail the short-edge gate. All other edges retain strict length comparisons.

Mirror-symmetry candidates are XY, YZ and XZ through the volume centroid, plus
planes through that centroid normal to each principal inertia axis. Coincident
planes retain both names; repeated moments can make inertia axes non-unique.
An optional `asserted_plane` uses the supplied origin and normalized nonzero
normal. Candidate results are discovery: an asymmetric body can pass topology
checks. When an asserted plane is supplied, it must also pass for overall `ok`.

Each plane reports `passed`, `maxDeviationMm`, `rmsDeviationMm`, `sampleCount`
and `worst` source/reflected/closest points with triangle indices. The
`symmetry.matchingPlanes` array lists matches. Every mesh triangle contributes
its vertices, three edge midpoints and centroid; reflected samples are compared
to the mesh with BVH closest-point distance. Reflection is an involution, so
this tests samples from both sides of the plane. Defaults: 0.05 mm symmetry
tolerance and absolute mesh deflection of tolerance/4. An explicit
`mesh_deflection_mm` must be positive and no greater than tolerance/2.
Meshes above 100,000 triangles or with empty/degenerate data yield an error
rather than a partial pass.

**This is sampled tessellation evidence, not exact BREP symmetry proof.** Small
defects between samples can be missed, curved tessellation can affect distances,
and the maximum is over samples, not a continuous surface bound. Tighten mesh
deflection when reviewing curved parts. No extra mesh allowance is added to the
symmetry tolerance. Local geometry checks do not certify manufacturing,
structural loads or hardware acceptance. This opt-in check does not replace
script-declared DFM gates.

## Runs automatically on export

Exports to STL, STEP, 3MF, OBJ, PLY and G-code run the tiny-face and
short-edge half of this check on every solid body before the file is written.
Each assembly part is checked on its own. The export gate skips the symmetry
sampling and does no meshing. It uses the defaults above (0.01 mm² and 0.1 mm),
and `tiny_face_area_mm2` / `short_edge_length_mm` on the export call override
them.

```json
{ "target": "model", "file": "bracket.kcad.ts", "format": "step",
  "output_path": "out/bracket.step", "qualityGate": "warn" }
```

- `qualityGate: "warn"` (default): the file is written. The result carries
  `geometryQuality { ok, tinyFaces, shortEdges, worst, thresholds, parts }`.
  `worst` lists up to five findings, smallest relative to their threshold
  first, each with its part, BREP id, world-frame location and size. The
  result also carries warn diagnostics `export.geometry-quality.tiny-faces`
  and `export.geometry-quality.short-edges`.
- `qualityGate: "block"`: the same findings are errors. The export returns
  `ok: false` and writes no file.
- `qualityGate: "off"`: the gate does not run.

`target: "part"` per-part STL exports take the same keys. On the CLI, use
`kernelcad export step part.kcad.ts -o part.step --quality-gate block`, with
`--tiny-face-area-mm2` and `--short-edge-length-mm` for the thresholds.

Some bodies are skipped, each with an info diagnostic
`export.geometry-quality.skipped`. Shells, faces and mixed compounds are
skipped, and so are mesh (lattice) bodies. A multi-solid compound is checked
one solid at a time. Bodies that would take the run past a 10,000-face budget
are also skipped, so a very large assembly is screened up to that budget.
Instanced parts that share one shape are measured once. Face areas come from
an adaptive integration with 0.1% relative error. Faces within 1% of the
threshold are re-measured exactly, so the tiny or not-tiny verdict matches the
`verify` check. On the gallery turbojet assembly (42 bodies, 2,122 faces) the
gate adds about 0.9 s to a 37 s STEP export. Drawings, DXF, BOMs, robot
descriptions, GLB and USD are not gated.

Focused synthetic geometry tests cover tiny steps, short edges, symmetric and
asymmetric brackets, rotated bodies and sphere pole edges in
`src/agent/mcp/tools/checkGeometryQuality.test.ts`. The export gate's warn,
block and off modes, assembly parts, skips and budget are covered in
`tests/integration/export/qualityGate.test.ts`. A video of the gate is in
`docs/demos/export-quality-gate/`.
