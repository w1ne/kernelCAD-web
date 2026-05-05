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
box(x: number, y: number, z: number, centered?: boolean, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
cylinder(h: number, r: number, segments?: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
sphere(r: number): Shape;  // faceLabels NOT accepted — sphere has no canonical faces

// Extrusion helpers — profile defined inline, extruded along Z.
extrudeRect(w: number, h: number, height: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
extrudeCircle(r: number, height: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
extrudePolygon(points: [number, number][], depth: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
extrudeRoundedRect(width: number, height: number, radius: number, depth: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;

// Revolve helper — rectangular profile revolved around Z (offset from axis by offsetX).
revolveRect(w: number, h: number, offsetX: number, angleDeg?: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;

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

- `feature.face-ref.ambiguous-after-split` — an upstream boolean split the named face into multiple children (e.g., a divider cut splits `top` into two halves). Geometry-fallback disambiguation is planned for a future release; current workaround: apply the edge/face feature before the splitting operation, or use a query-based selector.
- `feature.face-ref.removed` — an upstream boolean removed the named face entirely. Reference a different face that still exists in the current shape.

(The same `feature.face-ref.*` codes apply to both edge features (`fillet`, `chamfer`) and face features (`shell`).)

Per-primitive canonical face applicability:
- Box: all six (`top` / `bottom` / `left` / `right` / `front` / `back`).
- Cylinder: only `top` and `bottom` (the disc end-caps). Side faces have no canonical name.
- Sphere: none. Sphere with any `{ face }` filter → error.

## Labels — naming faces at creation time

Declare a label on a creating op via the `faceLabels` option. The value map accepts two kinds of entries:

**Canonical alias** — give a custom name to a canonical face:

```typescript
box([10, 10, 5], { faceLabels: { lid: 'top', base: 'bottom' } })
  .fillet(2, { face: 'lid' });
```

**Query-based label** — name a face that has no canonical name, via `FaceQuery`:

```typescript
extrudeRect(20, 10, 5, { faceLabels: { rim: { atZ: 5, parallelTo: 'XY' } } })
  .shell(1, { face: 'rim' });
```

Labels survive transforms (`.translate`, `.rotate`, `.scale`, `.reflect`, `.mirror`) and unambiguous booleans (`.subtract`, `.union`, `.intersect`) — the same lineage rules as canonical face refs. Splitting booleans emit `feature.face-ref.ambiguous-after-split`.

`sphere` does not accept `faceLabels` (no canonical face names; query targets undefined). Use a different primitive if labels are needed.

Discover labels on a script with the `list_face_labels` MCP tool — it surfaces both `faceLabels`-declared labels (creating-op metadata) and sketch-segment labels (`path().label('rim')`).

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

## When something fails

Every kernel-running tool returns `diagnostics[]`. Each entry has `code`,
`message`, `severity`, optional `feature_id`, and a `hint` — a one-sentence,
imperative recovery instruction. Read the `hint` first; if your feature
failed because an upstream feature failed (`code` is
`recompute.input.missing`), call `why_did_this_fail` to walk the chain
and find the root cause.

The full code catalogue (24 codes) is enumerated by the
`list_diagnostic_codes` MCP tool. Call it once at session start if you
want to pre-populate retry strategies.

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

When you have `kernelcad mcp` available, use the MCP tools for dynamic introspection rather than re-running the CLI. The MCP server exposes 16 tools:

- `evaluate_script({ file? code? })` — pass/fail + featureCount + diagnostics
- `list_features({ file? code? })` — array of feature summaries (kind/id/params/inputs)
- `get_shape_info({ file? code?, feature_id? })` — volume/surfaceArea/bbox of a feature (default: last)
- `list_topology({ file? code?, feature_id? })` — canonical face names + edge count
- `get_edges_of({ file? code?, feature_id?, face_name })` — boundary edges of a face (centroid, length, isClosed)
- `why_did_this_fail({ file? code?, feature_id? })` — walk the upstream chain of a failing feature; returns each upstream feature's id/kind/health/diagnostics in topological order (per-code hints already inline on every diagnostic).
- `set_param_value({ file? code?, param_name, value })` — override a param and recompute
- `add_feature({ file? code?, kind, ... })` — append a new feature to the script's feature tree
- `remove_feature({ file? code?, feature_id })` — suppress/remove a feature by id
- `list_edges({ file? code?, feature_id? })` — enumerate all edges (index, centroid, length, isClosed)
- `list_faces({ file? code?, feature_id? })` — enumerate all faces with area and centroid
- `list_face_labels({ file? code?, feature_id? })` — canonical face names resolvable on a feature
- `list_api({})` — full curated API surface (globals, Shape methods, Sketch methods)
- `list_diagnostic_codes({})` — return the 24-code diagnostic catalogue with hint templates (one-shot; useful at session start to pre-populate retry strategies).
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
- Prefer `target.hole(face, opts)` for cylindrical bores (single hole), `target.holes(face, opts)` for bolt patterns, and `target.cutout(profile, opts)` for irregular subtractive shapes (slots, D-pockets) over `subtract(cylinder)` — they emit named created refs (`'wall'`, `'floor'`, `'wall-back'`, `'counterbore-wall'`, `'counterbore-floor'`, `'countersink-cone'`) that downstream `.fillet()` / `.shell()` can address.
- Apply transforms AFTER edge/face features when the face filter matters; transforms commute with everything except face-ref resolution.
- Always `return` a single shape from the top of the script — the kernelCAD CLI exports whatever you return.
- For symmetric parts, prefer `.mirror(plane)` (union of source + reflection) over manual duplication. Use `.reflect(plane)` when you only want the reflected geometry without the original.
- For helical features (coils, springs, threads), generate the rail with `helix(...)` and sweep a closed `path()` profile with `frenet: true`.
