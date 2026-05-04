---
name: kernelcad
description: kernelCAD model authoring guide for `.kcad.ts` scripts — primitives, transforms, booleans, edge features (fillet/chamfer/shell), face features, sketches with arbitrary profiles, sketch operations (extrude/revolve/sweep/loft/reflect), path builder, mirror/reflect, parameters with units, exports. Use when writing or modifying kernelCAD geometry from a coding agent context.
---

# kernelCAD

Author or modify kernelCAD models in TypeScript. Scripts live in `.kcad.ts` files; the kernelCAD CLI (`kernelcad evaluate <file>` and `kernelcad export stl|step <file> -o <out>`) executes them via an OpenCASCADE WASM kernel.

This skill is the one-shot authoring companion to the kernelCAD MCP server (`kernelcad mcp`). Use this skill to write scripts; use the MCP server when you need to introspect a running model dynamically (volume, edge counts, why a feature failed).

## Installation

```bash
npm install -g kernelcad
kernelcad evaluate path/to/script.kcad.ts
```

Verify the install with `kernelcad --version` (should print `0.1.0` or higher).

## Coordinate System

- **Z-up**, right-handed.
- All linear dimensions are millimetres.
- All angles are degrees.
- Box: corner-anchored at the origin (spans `[0, x] × [0, y] × [0, z]`). Pass `centered: true` as the fourth argument to anchor at the centroid.
- Cylinder: axis along Z, base at `z=0`, top at `z=h`.
- Sphere: centred at the origin.

## API Surface

### Top-level functions

```typescript
// Parameters with units and bounds. Returned value is a number; the param() call
// also registers a UI slider when the script is run interactively.
param(name: string, defaultValue: number | string, opts: {
  unit: 'mm' | 'in' | 'm' | 'deg' | 'rad' | 'unitless';
  min?: number;
  max?: number;
  description?: string;
}): number;

// Primitives. Each returns a Shape.
box(x: number, y: number, z: number, centered?: boolean): Shape;
cylinder(h: number, r: number): Shape;
sphere(r: number): Shape;

// Extrusion helpers — profile defined inline, extruded along Z.
extrudeRect(w: number, h: number, height: number): Shape;
extrudeCircle(r: number, height: number): Shape;
extrudePolygon(points: [number, number][], depth: number): Shape;
extrudeRoundedRect(width: number, height: number, radius: number, depth: number): Shape;

// Revolve helper — rectangular profile revolved around Z (offset from axis by offsetX).
revolveRect(w: number, h: number, offsetX: number, angleDeg?: number): Shape;

// Path builder — chain moveTo / lineTo / arcs / .close() to get a Sketch.
path(): PathBuilder;

// Boolean union of two or more shapes (top-level alternative to .union()).
union(...shapes: Shape[]): Shape;

// Polyline helix rail for Sketch.sweep.
helix({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }): [number, number, number][];

// Edge selection — lowers the shape lazily (awaitable).
selectEdges(shape: Shape, query?: EdgeQuery): Promise<EdgeSegment[]>;
selectEdge(shape: Shape, query: EdgeQuery): Promise<EdgeSegment>;  // throws if zero or multiple match
```

### Shape methods (chainable)

```typescript
// Transforms (mutate-then-return-this; chain freely):
.translate(x: number, y: number, z: number): Shape
.rotate(axis: [number, number, number], degrees: number, pivot?: [number, number, number]): Shape
.scale(sx: number, sy?: number, sz?: number): Shape

// Booleans (each returns a NEW Shape that captures a 'boolean' feature record):
.union(...others: Shape[]): Shape
.subtract(...others: Shape[]): Shape
.intersect(...others: Shape[]): Shape

// Edge features:
// Simple form — single radius applied to matching edges:
.fillet(radius: number, edges?: EdgeSelector): Shape
// Variable-radius form — one group per blend region:
.fillet([{ edges: EdgeSelector, radius: number }, ...]): Shape
// Bevel edges (same selector shape as fillet):
.chamfer(distance: number, edges?: EdgeSelector): Shape
.chamfer([{ edges: EdgeSelector, distance: number }, ...]): Shape

// Face features:
.shell(thickness: number, { face: FaceSelector }): Shape  // face REQUIRED

// Symmetry operations:
// Pure reflection across a cardinal plane (no union — volume unchanged, handedness flipped):
.reflect(plane: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset: number }): Shape
// Boolean union of the source and its reflection — produces a symmetric part:
.mirror(plane: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset: number }): Shape

// Eager lowering (for inspection; rarely called by agents directly):
.lower(): Promise<OcctBackend>
```

`EdgeSelector = EdgeQuery | EdgeSegment[] | { face: string | FaceQuery } | undefined`
`FaceSelector = CanonicalFace | string (label) | FaceQuery`
`CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'`

### Sketch methods

A `Sketch` is produced by `path()...close()`. All Sketch methods return a `Shape` (or another `Sketch` for `reflect`).

```typescript
// Extrude closed sketch normal to its plane by `depth` (mm):
.extrude(depth: number): Shape

// Revolve 360 degrees around the Z axis.
// Profile coords are (radial-X, axial-Z); all x >= 0.
.revolve(): Shape

// Sweep this profile along a 3D polyline rail.
// frenet: true recommended for helices/curves; default false for straight/L-bend rails.
.sweep(rail: [number, number, number][], opts?: { frenet?: boolean }): Shape

// Loft through one or more additional sections to produce a 3D solid.
// Use for nozzles (round-to-square), wings, fairings, transition pieces.
// opts.spacing z-stacks sections axially; opts.planes overrides with explicit per-section placement.
.loft(other: Sketch | Sketch[], opts?: {
  spacing?: number;
  planes?: { normal: [number, number, number]; origin: [number, number, number] }[];
  ruled?: boolean;
  startPoint?: [number, number];
  endPoint?: [number, number];
}): Shape

// Reflect this sketch's path across an axis, returning a new Sketch.
// 'x' negates y-coords; 'y' negates x-coords; { axis, offset } reflects across a parallel axis.
// Arc winding is inverted automatically. Labels are preserved.
.reflect(axis: 'x' | 'y' | { axis: 'x' | 'y'; offset: number }): Sketch
```

### PathBuilder methods

`path()` returns a `PathBuilder`. Chain these calls; finish with `.close()` to get a `Sketch`.

```typescript
.moveTo(x: number, y: number): PathBuilder      // Required first call — sets the start point.
.lineTo(x: number, y: number): PathBuilder      // Straight segment to (x, y).
.tangentArc(x: number, y: number): PathBuilder  // Arc continuing tangent from prior segment.
.threePointsArc(x: number, y: number, midX: number, midY: number): PathBuilder  // Arc through start, mid, end.
.sagittaArc(x: number, y: number, sagitta: number): PathBuilder  // Arc by chord + perpendicular bulge. Sign chooses side.
.bulgeArc(x: number, y: number, bulge: number): PathBuilder      // Arc by chord + DXF bulge factor (tan(angle/4)).
.radiusArc(x: number, y: number, radius: number): PathBuilder    // Arc by chord + explicit radius; sign chooses side.
.label(name: string): PathBuilder               // Tag the prior segment for fillet/chamfer/shell by name.
.close(): Sketch                                // Close path; returns a Sketch.
```

## Face refs through operations

Canonical face refs (`{ face: 'top' }`, etc.) work transparently across transforms (`.translate`, `.rotate`, `.scale`, `.reflect`, `.mirror`) and unambiguous booleans (`.subtract`, `.union`, `.intersect`). The kernel walks each face's lineage back to its originating primitive and forward through history.

Two cases produce explicit diagnostics:

- `feature.edge-feature.face-ref-ambiguous-after-split` — an upstream boolean split the named face into multiple children (e.g., a divider cut splits `top` into two halves). Geometry-fallback disambiguation is planned for a future release; current workaround: apply the edge feature before the splitting operation, or use a query-based selector.
- `feature.edge-feature.face-ref-removed` — an upstream boolean removed the named face entirely. Reference a different face that still exists in the current shape.

(`face-feature.*` parallel codes apply to `.shell()`.)

Per-primitive canonical face applicability:
- Box: all six (`top` / `bottom` / `left` / `right` / `front` / `back`).
- Cylinder: only `top` and `bottom` (the disc end-caps). Side faces have no canonical name.
- Sphere: none. Sphere with any `{ face }` filter → error.

## Sample Scripts

### Parametric bracket with hole

```typescript
const w = param('Width', 60, { unit: 'mm', min: 30, max: 200 });
const h = param('Height', 40, { unit: 'mm', min: 20, max: 120 });
const t = param('Thickness', 5, { unit: 'mm', min: 2, max: 15 });

const base = box(w, h, t);
const hole = cylinder(t + 2, 4).translate(w / 2, h / 2, -1);
return base.subtract(hole);
```

### Sketch builder + extrude pipeline

```typescript
// Arbitrary 2D profile via path builder, then extruded.
const depth = param('Depth', 10, { unit: 'mm' });

const profile = path()
  .moveTo(0, 0)
  .lineTo(30, 0)
  .lineTo(30, 20)
  .sagittaArc(15, 30, 5)
  .lineTo(0, 20)
  .close();

return profile.extrude(depth);
```

### Variable-radius blend

```typescript
// Different fillet radii on different edge selections.
const body = box(40, 30, 15);

const topEdges = await selectEdges(body, { face: 'top' });
const bottomEdges = await selectEdges(body, { face: 'bottom' });

return body.fillet([
  { edges: topEdges, radius: 5 },
  { edges: bottomEdges, radius: 1 },
]);
```

### Mirror — symmetric part

```typescript
// Build one half and mirror across the YZ plane.
const half = box(20, 40, 10)
  .subtract(cylinder(10, 6).translate(10, 20, -1))
  .fillet(2);

return half.mirror('yz');
```

### Helix sweep

```typescript
// Swept circular profile along a helix — basic coil.
const coilRadius = param('CoilRadius', 15, { unit: 'mm' });
const wireRadius = param('WireRadius', 1.5, { unit: 'mm' });
const turns = param('Turns', 4, { unit: 'unitless' });

const rail = helix({ radius: coilRadius, pitch: wireRadius * 3, turns });
const profile = path()
  .moveTo(wireRadius, 0)
  .sagittaArc(-wireRadius, 0, wireRadius)
  .sagittaArc(wireRadius, 0, wireRadius)
  .close();

return profile.sweep(rail, { frenet: true });
```

## Diagnostic Codes

When the kernel rejects a feature, it emits a `CompilerDiagnostic` with one of these codes. Use `kernelcad evaluate --json <file>` (or the MCP `why_did_this_fail` tool) to read them.

### feature.fillet.*

| Code | Meaning |
|---|---|
| `feature.fillet.failed` | OCCT could not apply that fillet. Try a smaller radius — typically less than half of the smallest face dimension. |
| `feature.fillet.no-base` | Fillet has no base shape. Ensure the fillet is chained onto a solid shape. |
| `feature.fillet.no-radius` | Fillet is missing a radius parameter. Pass a positive number as the first argument. |
| `feature.fillet.empty-groups` | Variable-radius fillet needs at least one group. Pass `[{ edges: ..., radius: ... }, ...]`. |
| `feature.fillet.invalid-group` | Each fillet group needs `edges` and a positive finite `radius`. Check the failing entry's index in the diagnostic message. |
| `feature.fillet.invalid-edge-ref` | Variable-radius fillet edge_group input must be an edge or face ref. Feature/vertex refs are not supported in this slot. |

### feature.chamfer.*

| Code | Meaning |
|---|---|
| `feature.chamfer.failed` | OCCT could not apply that chamfer. Try a smaller distance — typically less than half of the smallest face dimension. |
| `feature.chamfer.no-base` | Chamfer has no base shape. Ensure the chamfer is chained onto a solid shape. |
| `feature.chamfer.no-distance` | Chamfer is missing a distance parameter. Pass a positive number as the first argument. |
| `feature.chamfer.empty-groups` | Variable-distance chamfer needs at least one group. Pass `[{ edges: ..., distance: ... }, ...]`. |
| `feature.chamfer.invalid-group` | Each chamfer group needs `edges` and a positive finite `distance`. |
| `feature.chamfer.invalid-edge-ref` | Variable-distance chamfer edge_group input must be an edge or face ref. Feature/vertex refs are not supported in this slot. |

### feature.mirror.*

| Code | Meaning |
|---|---|
| `feature.mirror.no-base` | Mirror has no base shape. Ensure mirror is chained onto a solid shape. |
| `feature.mirror.invalid-plane` | Mirror plane must be `'xy'`, `'xz'`, `'yz'`, or `{ plane: '<cardinal>', offset: <number> }`. |
| `feature.mirror.failed` | OCCT could not union the source with its reflection. Common cause: source shape touching the mirror plane (zero-thickness intersection). Translate the source away from the plane, or use a plane offset. |

### feature.transform.*

| Code | Meaning |
|---|---|
| `feature.transform.invalid-translate` | Translate Vec3 must be three finite numbers. Check the (x, y, z) arguments to `.translate()`. |
| `feature.transform.invalid-rotate` | Rotate axis must be a finite Vec3 and degrees must be a finite number. Check the arguments to `.rotate(axis, degrees, pivot?)`. |
| `feature.transform.invalid-scale` | Scale factor must be a positive finite number, or a Vec3 of three positive finite numbers. Check the argument to `.scale()`. |
| `feature.transform.invalid-reflect` | Reflect plane must be `'xy'`, `'xz'`, `'yz'`, or `{ plane: '<cardinal>', offset?: number }`. Check the argument to `.reflect()`. |
| `feature.transform.invalid-plane` | Reflect transform plane must be `'xy'`, `'xz'`, `'yz'`, or `{ plane: '<cardinal>', offset?: number }`. Check the plane argument on the `Shape.reflect` call. (Forward-looking infrastructure gate; agents see `feature.transform.invalid-reflect` at capture time first.) |

### feature.shell.*

| Code | Meaning |
|---|---|
| `feature.shell.failed` | OCCT could not shell that solid. Try a thinner wall or a different open face. Thickness must be smaller than the shape's minimum thickness. |
| `feature.shell.no-base` | Shell has no base shape. Ensure the shell is chained onto a solid shape. |
| `feature.shell.no-thickness` | Shell is missing a thickness parameter. Pass a positive number as the first argument. |

### feature.extrude.* / feature.revolve.*

| Code | Meaning |
|---|---|
| `feature.extrude.unsupported-profile` | The extrude profile is not a supported 2D sketch type. Ensure you pass a sketch or closed wire as the profile. |
| `feature.extrude.bad-sketch` | extrude with profile='sketch' requires an upstream sketch input. Ensure the extrude is chained from a `path()...close()` sketch. |
| `feature.extrude.bad-points` | extrudePolygon requires at least 3 points, each a `[number, number]` pair. Check that the points array is correctly formed. |
| `feature.extrude.bad-params` | extrudeRoundedRect requires width, height, radius, and depth parameters. Ensure all four are provided as positive finite numbers. |
| `feature.extrude.failed` | OCCT could not extrude that profile. Common causes: self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height. |
| `feature.revolve.unsupported-profile` | The revolve profile is not a supported 2D sketch type. Ensure you pass a sketch or closed wire as the profile. |
| `feature.revolve.crosses-axis` | A revolve profile must stay on one side of the rotation axis. Ensure all path coordinates have x >= 0. |
| `feature.revolve.empty-profile` | A revolve profile needs at least one lineTo or arc segment. A path with only moveTo + close has zero area. |
| `feature.revolve.failed` | OCCT could not revolve the profile. The profile may self-intersect or have a degenerate shape. |
| `feature.revolve.bad-sketch` | revolve with profile='sketch' requires a sketch input. Check upstream sketch diagnostics first. |

### feature.sweep.*

| Code | Meaning |
|---|---|
| `feature.sweep.invalid-rail` | Sweep rail must be an array of at least 2 points, each a `[x, y, z]` tuple of finite numbers. Use `helix(...)` for helical rails. |
| `feature.sweep.failed` | OCCT could not sweep the profile along the rail. Common causes: profile larger than rail curvature, sharp corners causing self-intersection, or non-planar profile. |
| `feature.sweep.multi-face-profile` | The profile sketch produces multiple closed loops. Sweep requires a single closed loop. *(direct-lowerer-only)* |
| `feature.sweep.profile-too-large` | The sweep profile is too large for the rail's tightest curvature. Reduce profile size or increase curvature radius. |
| `feature.sweep.spine-self-intersection` | The rail polyline self-intersects when extruded along the profile. Smooth the rail's corners or relax helix pitch. |
| `feature.sweep.bad-sketch` | sweep with profile='sketch' requires a sketch input. Check upstream sketch diagnostics first. |
| `feature.sweep.unsupported-profile` | The sweep profile is not a supported 2D sketch type. Pass a closed `path()` sketch. |

### feature.loft.*

| Code | Meaning |
|---|---|
| `feature.loft.empty-sections` | Loft needs at least 2 sketches. Pass another `path()...close()` sketch as the first argument: `s1.loft(s2)`. |
| `feature.loft.invalid-planes` | If you pass `opts.planes`, its length must equal the total number of sections. Or omit planes and use `opts.spacing`. |
| `feature.loft.failed` | OCCT could not loft these sections. Common causes: profiles with very different vertex counts, mismatched orientation, or self-intersecting interpolation. Try `ruled: true` for sharp transitions. |
| `feature.loft.bad-sketch` | loft is missing an upstream sketch input. Check upstream sketch diagnostics first. *(direct-lowerer-only)* |

### feature.sketch.* / feature.sketch.reflect.*

| Code | Meaning |
|---|---|
| `feature.sketch.degenerate-arc` | An arc segment has degenerate geometry. For `radiusArc`: `|radius|` must be >= chord/2, and start must not coincide with end. Try a larger radius, different endpoints, `threePointsArc`, or `sagittaArc`. |
| `feature.sketch.reflect.invalid-axis` | Sketch reflection axis must be `'x'`, `'y'`, or `{ axis: 'x' | 'y', offset: <number> }`. |
| `feature.sketch.failed` | Sketch construction failed during lowering. Check the diagnostic message for the underlying error. |
| `feature.sketch.bad-commands` | Sketch has no path commands. Ensure the sketch was constructed via `path().moveTo(...).lineTo(...).close()` rather than created directly. |

### feature.path.*

| Code | Meaning |
|---|---|
| `feature.path.label-without-segment` | `label()` must follow a `lineTo` or arc segment. Calling `label()` before any segment, after `moveTo`, or after `close` has nothing to label. |
| `feature.path.duplicate-label` | Each sketch label must be unique. Pick a different name or remove the duplicate `label()` call. |

### feature.edge-feature.*

| Code | Meaning |
|---|---|
| `feature.edge-feature.face-ref-not-resolvable` | Canonical face refs only work on un-transformed primitives. Apply transforms after the fillet/chamfer, or fillet the primitive first then translate. |
| `feature.edge-feature.face-ref-not-applicable` | That canonical face name is not valid for this primitive. Boxes have all six; cylinders have only top/bottom; spheres have none. |
| `feature.edge-feature.face-ref-not-supported` | Edge/face ref kind not supported on this shape. Use a canonical name, a label, or an inline EdgeQuery instead. |
| `feature.edge-feature.face-ref-ambiguous-after-split` | Named face was split by an upstream boolean. Geometry-fallback planned for future release. |
| `feature.edge-feature.face-ref-removed` | Named face was removed by an upstream boolean. Reference a different face. |
| `feature.edge-feature.no-edges-match` | The selection matched no edges. Use the `list_edges` MCP tool to see what's available, or relax the query. |
| `feature.edge-feature.ambiguous-selection` | Multiple edges match this query. Use `selectEdges` (plural) for all matches, or tighten the query. |
| `feature.edge-feature.invalid-query` | Query has contradictory keys, an unknown segment id, or an unsupported ref kind. Check the EdgeQuery type. |

### feature.face-feature.*

| Code | Meaning |
|---|---|
| `feature.face-feature.face-required` | Shell needs a face to remove. Pass `{ face: 'top' }` (or another canonical face). |
| `feature.face-feature.face-ref-not-resolvable` | Canonical face refs only work on un-transformed primitives. Apply shell before transforms. |
| `feature.face-feature.face-ref-not-applicable` | That canonical face is not valid for this primitive. Cylinders accept only top/bottom for shell; spheres have no canonical faces. |
| `feature.face-feature.face-ref-not-supported` | Face ref kind not supported. Use a canonical name, a label, or an inline FaceQuery. |
| `feature.face-feature.face-ref-ambiguous-after-split` | Named face was split by an upstream boolean. Geometry-fallback planned for future release. |
| `feature.face-feature.face-ref-removed` | Named face was removed by an upstream boolean. Reference a different face. |
| `feature.face-feature.no-match` | The face query matched no faces. Use the `list_faces` MCP tool to see what's available, or relax the query. |
| `feature.face-feature.label-not-resolvable` | *(Deprecated)* Generic label resolution failure. See `feature.label.*` codes for the specific cause. |

### feature.label.*

| Code | Meaning |
|---|---|
| `feature.label.unknown-name` | Label not found on the upstream sketch. Use `list_face_labels` MCP tool to see available labels. |
| `feature.label.no-upstream-sketch` | Labels work on shapes built from a `path()` sketch. For primitives or imported shapes, use an inline face query instead. |
| `feature.label.unsupported-base` | Labels are supported for extrude only. Revolve/sweep labels are deferred. Use an inline query as a workaround. |
| `feature.label.mixed-convexity` | The labeled segment's probe matched a mix of convex and concave edges. Split the label across smaller segments, or refine with an inline EdgeQuery filtering by convexity. |
| `feature.label.collision` | Two or more upstream features declared the same `faceLabels` name. Each label must be unique within the scope visible to the consumer. Rename one of the conflicting `faceLabels` entries. |
| `feature.label.query-no-match` | A query-based `faceLabel` matched zero faces at the consumer site. Check the query (e.g. `atZ` value) against the actual shape geometry with `list_faces`. |

### recompute.*

| Code | Meaning |
|---|---|
| `recompute.input.missing` | An upstream feature failed or was suppressed. Use `why_did_this_fail` on the upstream feature ID to find the root cause. |
| `recompute.lowering.exception` | An exception was raised during lowering. Check the diagnostic message for the OCCT error. |

### cli.*

| Code | Meaning |
|---|---|
| `cli.script.exception` | Your script raised an exception during execution. Check the diagnostic message for the JS error. |
| `cli.file.read` | kernelCAD could not read the script file at that path. Check the file exists and is readable. |
| `cli.no-input` | No input provided to the CLI command. Pass either a file path or inline code. |
| `cli.export.exception` | An exception occurred during export. Check the diagnostic message for details. |

### export.*

| Code | Meaning |
|---|---|
| `export.feature-not-found` | The feature_id passed to export_stl wasn't found. Use list_features to see available feature IDs. |
| `export.no-shape` | The script did not return a shape. Ensure your script ends with `return <shape>`. |
| `export.shape-not-lowered` | The returned shape could not be lowered to OCCT. Check for upstream errors in the feature tree. |

Each hint in the `hints` array includes a `reachable` classification:
- `'engine-path'` — fires during normal recompute; highest-signal for typical agent workflows.
- `'direct-lowerer-only'` — only reachable if the lowerer is invoked directly; through the standard MCP path, agents will see `recompute.input.missing` from an upstream feature instead.
- `'tool-error-field'` — the code appears in MCP tool results' `error` / `errorCode` field rather than the `diagnostics[]` array. Agents see these as top-level tool failures (file I/O, script exceptions, export errors).
- `'reserved'` — forward-looking infrastructure with no current trigger.

## CLI Commands

```bash
# Run a script and report features + diagnostics
kernelcad evaluate path/to/script.kcad.ts

# Same, but JSON output (machine-readable)
kernelcad evaluate path/to/script.kcad.ts --json

# Export to STL or STEP
kernelcad export stl path/to/script.kcad.ts -o /tmp/out.stl
kernelcad export step path/to/script.kcad.ts -o /tmp/out.step

# Run the MCP server (stdio transport)
kernelcad mcp
```

## MCP Companion (introspection)

When you have `kernelcad mcp` available, use the MCP tools for dynamic introspection rather than re-running the CLI. The MCP server exposes 15 tools:

- `evaluate_script({ file? code? })` — pass/fail + featureCount + diagnostics
- `list_features({ file? code? })` — array of feature summaries (kind/id/params/inputs)
- `get_shape_info({ file? code?, feature_id? })` — volume/surfaceArea/bbox of a feature (default: last)
- `list_topology({ file? code?, feature_id? })` — canonical face names + edge count
- `get_edges_of({ file? code?, feature_id?, face_name })` — boundary edges of a face (centroid, length, isClosed)
- `why_did_this_fail({ file? code?, feature_id? })` — focused diagnostics + upstream chain + human-readable hints
- `set_param_value({ file? code?, param_name, value })` — override a param and recompute
- `add_feature({ file? code?, kind, ... })` — append a new feature to the script's feature tree
- `remove_feature({ file? code?, feature_id })` — suppress/remove a feature by id
- `list_edges({ file? code?, feature_id? })` — enumerate all edges (index, centroid, length, isClosed)
- `list_faces({ file? code?, feature_id? })` — enumerate all faces with area and centroid
- `list_face_labels({ file? code?, feature_id? })` — canonical face names resolvable on a feature
- `list_api({})` — full curated API surface (globals, Shape methods, Sketch methods)
- `lookup_cookbook({ query, k? })` — retrieve up to k canonical pattern snippets ranked by BM25; returns `{ ok, hits[] }`. Empty hits is a valid success ("no canonical pattern; proceed without cookbook help").
- `export_stl({ file? | code?, output_path, feature_id? })` — write a binary STL file server-side; returns `{ ok, output_path, byte_count, feature_count, diagnostics }`. `feature_count` is the total features in the script, not the count contributing to the exported shape.

## Out of Scope

These return errors today; do not generate code that uses them:

- Tracked face/edge refs (only canonical refs and inline queries work) — deferred
- Asymmetric chamfer (only symmetric 45° supported) — deferred
- Hole / cut / draft as distinct features (use `subtract(cylinder)` etc.) — deferred
- Assemblies / joints — deferred
- BOM, dimensions, BREP, multi-view PDF — deferred

<!-- COOKBOOK:START -->
## Cookbook (snippet index)

When you need a canonical pattern, call MCP tool `lookup_cookbook(query, k?)` to fetch the full body of a snippet. The IDs and triggers below are the full v1 inventory; query by intent, not by ID.

| ID | Trigger |
|---|---|
| blind-pocket-from-top | You want a pocket cut into the top face only — the cylinder is shorter than the plate so it does not reach the bottom face. |
| chamfer-rotated-face | You rotated a primitive and now want to chamfer one of its canonical faces by name (face-name semantics survive transforms). |
| clearance-hole-through-plate | You need a through-hole sized for a bolt with a small clearance margin; cylinder height extends beyond the plate so the cut is unambiguous. |
| extrude-rounded-rect-plate | You want a flat plate with rounded corners; use the dedicated rounded-rect extrude rather than building corners by hand. |
| fillet-face-after-subtract | After subtracting a hole or pocket, you want to round only the rim of the resulting opening — not every edge in the part. |
| fillet-translated-shape | You translated a primitive and now want to fillet one of its canonical faces by name (canonical face refs survive translate). |
| mirror-half-part | The part is symmetric across a cardinal plane; build only one half and call mirror to produce the complete symmetric part. |
| non-overlapping-l-bracket | You're building two perpendicular plates joined at a right angle; both plates have the same thickness; volumes must not overlap at the joint. |
| parametric-bolt-pattern-skeleton | You want a part whose dimensions all derive from a single bolt-diameter parameter; thickness, plate size, hole clearance all scale together. |
| revolve-rectangular-profile | You want a thin cylindrical wall, ring, or tube — revolve a rectangle around Z with an offset from the axis equal to the inner radius. |
| subtract-then-fillet-rim | You want a parametric plate, drill a through-hole, and round the rim where the hole meets the top face. |
| union-of-stacked-primitives | You want to compose multiple primitives into one part by translating each into place and unioning them, without volume overlap. |

<!-- COOKBOOK:END -->

## Conventions

- Always declare params at the top of the script with units; the kernel evaluates them and surfaces them as live sliders to the studio.
- Prefer `subtract(cylinder)` for through-holes until a dedicated `hole` feature ships.
- Apply transforms AFTER edge/face features when the face filter matters; transforms commute with everything except face-ref resolution.
- Always `return` a single shape from the top of the script — the kernelCAD CLI exports whatever you return.
- For symmetric parts, prefer `.mirror(plane)` (union of source + reflection) over manual duplication. Use `.reflect(plane)` when you only want the reflected geometry without the original.
- For helical features (coils, springs, threads), generate the rail with `helix(...)` and sweep a closed `path()` profile with `frenet: true`.
