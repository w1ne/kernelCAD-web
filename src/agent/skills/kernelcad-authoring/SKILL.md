---
name: kernelcad-authoring
description: kernelCAD model authoring API — primitives, transforms, booleans, sketches, path-builder, sketch-text, return-single-shape rule, conventions, CLI commands, and verification gates. Load this when writing or modifying .kcad.ts geometry.
---

# kernelCAD — authoring

Author or modify kernelCAD models in TypeScript. Scripts live in `.kcad.ts` files; the kernelCAD CLI (`kernelcad evaluate <file>` and `kernelcad export stl|step <file> -o <out>`) executes them via an OpenCASCADE WASM kernel.

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
// Editable symbolic parameters. Returned value is a ParamRef accepted anywhere
// the API expects an editable number or boolean. Edit post-build with
// params_update via MCP / session.params.update in runtime code.
param<T extends number | boolean>(name: string, defaultValue: T, opts?: {
  min?: number;
  max?: number;
  description?: string;
}): ParamRef<T>;

params({ width: 60, addCablePort: true }): {
  width: ParamRef<number>;
  addCablePort: ParamRef<boolean>;
};

// Primitives. Each returns a Shape.
box(x: number, y: number, z: number, centered?: boolean, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
cylinder(h: number, r: number, segments?: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
sphere(r: number): Shape;  // faceLabels NOT accepted — sphere has no canonical faces

// Extrusion helpers — profile defined inline, extruded along Z.
extrudeRect(w: number, h: number, height: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
extrudeCircle(r: number, height: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
extrudePolygon(points: [number, number][], depth: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
extrudeRoundedRect(width: number, height: number, radius: number, depth: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;

// Path builder — chain moveTo / lineTo / arcs / .close() to get a Sketch. For
// revolved geometry (washers, donut bodies, mug profiles, etc.) build a profile
// via path() and call .revolve() on the resulting Sketch.
path(): PathBuilder;

// Boolean union of two or more shapes (top-level alternative to .union()).
union(...shapes: Shape[]): Shape;

// Inspectable mechanical assembly intent. Captures parts and joints as records.
// Call .model() to return one fused/exportable Shape of all placed parts.
assembly(name?: string): Assembly;

// Polyline helix rail for Sketch.sweep.
helix({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }): [number, number, number][];

// Edge selection — lowers the shape lazily (awaitable).
selectEdges(shape: Shape, query?: EdgeQuery): Promise<EdgeSegment[]>;
selectEdge(shape: Shape, query: EdgeQuery): Promise<EdgeSegment>;  // throws if zero or multiple match

// Parts library — STEP import for vendor catalog components.
// Resolved relative to the calling .kcad.ts file; absolute paths also accepted.
// Returns the standard capture-proxy Shape — composes with translate/rotate/color
// and arm.part(...) like any primitive.
lib.fromSTEP(path: string): Promise<Shape>;

// Reference-image overlay — virtual node (no OCCT geometry). The renderer draws
// the image on the chosen plane for tracing or design review. Path resolved
// relative to the calling .kcad.ts file. Supported formats: .png .jpg .jpeg .webp.
// Validation errors (missing file, bad format, invalid plane) are pushed as
// diagnostics on the returned handle rather than thrown.
referenceImage(path: string, opts: {
  plane: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset?: number };
  anchor?: 'origin' | [number, number, number];  // default 'origin'
  scale?: 'fit-bbox' | number | { width?: number; height?: number };  // default 'fit-bbox'
  opacity?: number;   // [0, 1], default 0.5
  flipU?: boolean;    // default false
  flipV?: boolean;    // default false
}): ReferenceImageHandle;

// HDRI / image-based lighting for the rendered scene (W2). Pass either a
// built-in `preset` key or a custom .hdr `url` (mutually exclusive).
// `intensity` (default 1.0; clamped to (0, 100]) scales envMapIntensity on
// every PBR material; `rotation` (degrees, default 0) rotates the env map
// around the world Y axis. Virtual record — no OCCT geometry produced.
// Default behavior (script never calls this) is the existing three-light
// rig. Multiple calls register multiple records; the renderer applies the
// last one.
setRenderEnvironment(spec: {
  preset?: 'studio' | 'softbox' | 'neutral' | 'outdoor' | 'warehouse';
  url?: string;
  intensity?: number;  // (0, 100], default 1.0
  rotation?: number;   // degrees around Y, default 0
}): RenderEnvironmentHandle;
```

### Shape methods (chainable)

```typescript
// Transforms (mutate-then-return-this; chain freely):
.translate(x: Editable<number>, y: Editable<number>, z: Editable<number>): Shape
.rotate(
  axis: [Editable<number>, Editable<number>, Editable<number>],
  degrees: Editable<number>,
  pivot?: [Editable<number>, Editable<number>, Editable<number>],
): Shape
// Uniform (single positive finite number) or per-axis Vec3 (non-uniform sx/sy/sz).
// Non-uniform lowers via gp_GTrsf + BRepBuilderAPI_GTransform so face refs survive
// (topology preserved under any affine transform). All factors must be positive
// and finite; otherwise feature.invalid-args.
.scale(factor: number | [number, number, number]): Shape

// Orient this shape so its current +Z axis aligns with `axis`. Sugar over .rotate() —
// preferred for cross-axis cylinders/axles. Identity [0, 0, 1] is a no-op; antipodal
// [0, 0, -1] is a deterministic 180° around X. Zero vector throws feature.invalid-args.
.alongAxis(axis: [number, number, number]): Shape

// Tag this shape with a render-time role color (geometry unchanged). Booleans drop
// the color so identity lives at leaf parts: a `.color()` call applied to a
// composed/unioned shape silently has NO effect on the underlying leaf parts —
// each part must be colored BEFORE it enters a boolean. Coloring the post-union
// root is a no-op; don't infer from a uniform-grey render that "renderer ignores
// .color()". Tokens: 'servo' | 'gear' | 'beam' | 'shaft' | 'plate' | 'pin' |
// 'frame' | 'tool'. Hex escape hatch: any '#rrggbb'.
.color(name: 'servo' | 'gear' | 'beam' | 'shaft' | 'plate' | 'pin' | 'frame' | 'tool' | `#${string}`): Shape

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

// Mechanical patterns:
.patternLinear({ count, direction, spacing }: { count: number; direction: [number, number, number]; spacing: number }): Shape
.patternGrid({ x, y }: { x: { count: number; direction: [number, number, number]; spacing: number }; y: { count: number; direction: [number, number, number]; spacing: number } }): Shape
.patternCircular({ count, axis, angleDeg? }: { count: number; axis: [number, number, number]; angleDeg?: number }): Shape

// Apply an SE(3) Transform (returned by SolvedKinematics.transform()) to a shape.
// Decomposes to translate + rotate via the existing transform pipes; no rebake.
.transform(t: Transform): Shape

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
// Limitation: any ParamRef coords in the source path are resolved to numeric
// values at reflect time, so the reflected sketch does not track param edits
// for the reflected coords. Author the reflected path directly (or split into
// halves and union them) when you need full param tracking on both halves.
.reflect(axis: 'x' | 'y' | { axis: 'x' | 'y'; offset: number }): Sketch
```

### PathBuilder methods

`path()` returns a `PathBuilder`. Chain these calls; finish with `.close()` to get a `Sketch`.

```typescript
.moveTo(x: Editable<number>, y: Editable<number>): PathBuilder      // Required first call — sets the start point.
.lineTo(x: Editable<number>, y: Editable<number>): PathBuilder      // Straight segment to (x, y).
.tangentArc(x: Editable<number>, y: Editable<number>): PathBuilder  // Arc continuing tangent from prior segment.
.threePointsArc(x: Editable<number>, y: Editable<number>, midX: Editable<number>, midY: Editable<number>): PathBuilder  // Arc through start, mid, end.
.sagittaArc(x: Editable<number>, y: Editable<number>, sagitta: Editable<number>): PathBuilder  // Arc by chord + perpendicular bulge. Sign chooses side.
.bulgeArc(x: Editable<number>, y: Editable<number>, bulge: Editable<number>): PathBuilder      // Arc by chord + DXF bulge factor (tan(angle/4)).
.radiusArc(x: Editable<number>, y: Editable<number>, radius: Editable<number>): PathBuilder    // Arc by chord + explicit radius; sign chooses side.
.smoothSpline(x: Editable<number>, y: Editable<number>): PathBuilder  // C1-smooth single-segment spline to (x, y); inherits start tangent.
.spline(points: Array<[Editable<number>, Editable<number>]>, opts?: { tension?: Editable<number> }): PathBuilder    // (Slice D) N-waypoint B-spline interpolation through every point. See kernelcad-nurbs.
.nurbsSegment(controlPoints: Array<[Editable<number>, Editable<number>]>, opts?: { degree?: number; weights?: number[]; knots?: number[] }): PathBuilder  // (Slice D) Explicit B-spline control polygon — controlPoints[0] must match current pen. See kernelcad-nurbs.
.hermiteG2(a: HermiteEndpoint2D, b: HermiteEndpoint2D): PathBuilder  // (Slice D) 2D quintic-Hermite G2 transition. See kernelcad-nurbs.
.label(name: string): PathBuilder               // Tag the prior segment for fillet/chamfer/shell by name.
.close(): Sketch                                // Close path; returns a Sketch.
```

Every PathBuilder coord and scalar accepts `Editable<number>` (`number | ParamRef<number>`), so symbolic params survive into capture and the dispatcher's pre-resolve substitutes them at lower time. Build derived dimensions with the ParamRef arithmetic methods (`.add`, `.subtract`, `.multiply`, `.divide`, `.negate`).

### 2D text (sketch.text)

Drop a string of glyph outlines into a sketch as a single closed-region primitive. The bundled font is an industry-standard sans-serif default; pass `font: fontPath('/abs/path/to/your.ttf')` to load any TTF.

```typescript
// Engraved label: cut text into a plate.
const plate = box(80, 30, 3);
const label = sketch.text("KERNEL", { size: 12, align: 'center', position: [40, 15] }).extrude(1.5);
return plate.subtract(label.translate(0, 0, 1.5));

// Raised logo: extrude text upward as a protrusion.
const base = extrudeRect(60, 60, 2);
const logo = sketch.text("KC", { size: 20, align: 'center', position: [0, 0], rotation: 15 }).extrude(1.5);
return base.union(logo.translate(0, 0, 2));
```

Options:
- `size` (required, mm): glyph cap height.
- `align` (`'left' | 'center' | 'right'`, default `'left'`): horizontal alignment relative to `position`. Vertical alignment is always baseline.
- `position` (`[x, y]`, default `[0, 0]`): anchor point in the sketch's local plane.
- `rotation` (degrees CCW, default `0`): rotation around `position`.
- `font` (default = bundled): logical name (must be previously loaded) OR `fontPath('/abs/file.ttf')`.

Returns a single `Sketch` covering the whole string — chain `.extrude(depth)` to land 3D text.

### Constrained sketches (v0.4 MCP)

The script `path()` API remains the way to author production geometry. The v0.4 constrained-sketch MCP tools are for side-effect-free sketch solving and agent discovery: pass explicit `POINT`, `LINE`, and `CIRCLE` entity records plus a constraint list, then use the returned coordinates to author or adjust a script.

Supported constraint types:

`COINCIDENT`, `DISTANCE`, `HORIZONTAL`, `VERTICAL`, `PARALLEL`, `PERPENDICULAR`, `EQUAL_LENGTH`, `TANGENT`, `RADIUS`, `ANGLE`, `CONCENTRIC`, `SYMMETRIC`

Minimal tool flow:

- `list_constraints({ constraints? })` — discover the supported types and echo the current constraint list.
- `add_constraint({ constraints?, constraint })` — validate one constraint and return a new list; no session state is mutated.
- `solve_sketch({ entities, constraints })` — solve a 2D constraint set and return `{ ok, entities, constraints }` or validation errors; no script is modified.

Entity and selection recovery:

- If a constraint references a missing id, list the entity ids you are passing and fix the `entities` array before solving.
- If a `LINE` references non-POINT endpoints or a `CIRCLE` references a non-POINT center, replace the referenced id with a `POINT`.
- If a constraint reports the wrong entity count, check the type arity: most types use 2 entities; `RADIUS` uses 1, `ANGLE` uses 1 or 2, and `SYMMETRIC` uses 3.
- If `DISTANCE`, `RADIUS`, or `ANGLE` reports a missing value, add a numeric `value`.
- If the type is unsupported, call `list_constraints({})` or `list_api({})` and choose one of the supported types above.

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

## When something fails

Every kernel-running tool returns `diagnostics[]`. Each entry has `code`,
`message`, `severity`, optional `feature_id`, and a `hint` — a one-sentence,
imperative recovery instruction. Read the `hint` first; if your feature
failed because an upstream feature failed (`code` is
`recompute.input.missing`), call `why_did_this_fail` to walk the chain
and find the root cause.

The full code catalogue is enumerated by the
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

# Render a 4-view PNG (front/right/top/iso) for visual review.
# Always pass --width 1920 --height 1080: the demo-player page layout is
# fixed at 1920×1080 (terminal pane 640 + viewer pane 1280); rendering at
# the CLI default 1024×1024 silently clips the viewer pane and crops the
# model on the right side.
kernelcad render path/to/script.kcad.ts --width 1920 --height 1080 -o /tmp/out.png

# Detect BREP interferences between Scene parts (industry-standard clash check)
kernelcad interference path/to/script.kcad.ts

# Validate the assembly: floating parts, orphan clusters, interferences (v0.5 MVP)
kernelcad validate path/to/script.kcad.ts

# Run the MCP server (stdio transport)
kernelcad mcp
```

## Out of Scope

These return errors today; do not generate code that uses them:

- Tracked face/edge refs (only canonical refs and inline queries work) — deferred
- Asymmetric chamfer (only symmetric 45° supported) — deferred
- Draft features — deferred
- Dynamic assembly solving / motion simulation — deferred; static assembly parts, fixed connector placement, revolute joint metadata, and fused `assembly.model()` output are supported.
- BOM, dimensions, BREP, multi-view PDF — deferred
- Rational NURBS (control-net `weights`) — accepted at the API but ignored in slice-1; rational support pending WASM bindings.
- NURBS surface trim/extend/untrim/blend, surface-surface intersection, lattice/quilt — deferred

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
| hermite-g2-blend | You have a pair of existing NURBS curves whose tangents and curvatures match at the join point and you want a G2-continuous compound spine (so a downstream variableSweep does not kink at the join). Author the flanks via nurbsCurve, then drop a hermiteG2 between them with matching endpoint tangents and curvatures. |
| mirror-half-part | The part is symmetric across a cardinal plane; build only one half and call mirror to produce the complete symmetric part. |
| non-overlapping-l-bracket | You're building two perpendicular plates joined at a right angle; both plates have the same thickness; volumes must not overlap at the joint. |
| parametric-bolt-pattern-skeleton | You want a compact bolt-hole part with an editable bolt-diameter parameter that can be changed later. |
| path-hermite-g2-blend-2d | You're authoring a freeform 2D outline that should transition from one prescribed point + tangent (+ curvature) to another with G2 continuity (no visible curvature crease where adjacent neighbours meet). Drop a single .hermiteG2(a, b) call into the chain; a.point must match the current pen position. Tangent magnitude is the first derivative (typical ~ chord length, NOT unit length). |
| path-nurbs-segment-explicit | You have an explicit B-spline control polygon (programmatic generation, round-tripping from external CAD, when precise shape control beats waypoint convenience) and want a 2D path segment authored from the control net directly. The first control point must match the current pen position within 1e-6 mm; the pen ends at the last control point. |
| path-spline-organic-outline | You need a freeform 2D outline (eyewear brow, ergonomic grip silhouette, sneaker midsole) authored as a sequence of measured waypoints, and arc primitives + smoothSpline are too rigid. Drop a single .spline([...]) call into the path() chain after moveTo; the path interpolates through every waypoint at degree 3. |
| revolve-rectangular-profile | You want a thin cylindrical wall, ring, or tube — author the rectangular profile via path() with the inner radius as the x offset, then call .revolve() to sweep it around Z. |
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

## Sample

### Parametric bracket with hole

```typescript
const w = param('width', 60, { min: 30, max: 200 });
const h = param('height', 40, { min: 20, max: 120 });
const t = param('thickness', 5, { min: 2, max: 15 });
const holeRadius = param('holeRadius', 4, { min: 1.5, max: 10 });

const base = box(w, h, t);
const hole = cylinder(8, holeRadius).translate(30, 20, -1);
return base.subtract(hole);
```

### Sketch builder + extrude pipeline

```typescript
// Arbitrary 2D profile via path builder, then extruded.
const depth = param('depth', 10, { min: 1, max: 40 });

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

## Verification gates

After authoring, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate <script>` exits 0, zero diagnostics |
| G-return | Script returns a single `Shape` or `Scene` (not undefined, not an array) |
| G-no-overlap | `kernelcad interference <script>` reports zero overlapping volumes |
| G-no-floaters | Every named part appears at the intended position in `kernelcad render` output — nothing hovers in empty space |
| G-conventions | Units mm + degrees, Z-up, all transforms after edge/face features when face-ref names matter |

For visual / reference-driven tasks the gate set extends — see `kernelcad-from-reference`.

## Materials

`Shape.material(opts)` applies a PBR material to a shape. Use it instead of
`.color()` when the reference shows gloss, specular highlights, or translucency.

**Critical rule:** apply `.material()` to leaf parts BEFORE they enter a boolean.
A `.material()` call on a post-union root is a no-op — the kernel cannot
retroactively assign material to the input leaves of a boolean.

Common presets:

```typescript
// Glossy acetate (eyewear, cases)
part.material({
  baseColor: '#0a0a0a',
  metalness: 0.0,
  roughness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.05,
  ior: 1.55,
});

// Brushed aluminum (enclosures, brackets)
part.material({
  baseColor: '#b0b0b0',
  metalness: 1.0,
  roughness: 0.3,
});

// Clear glass (lenses, domes)
part.material({
  baseColor: '#ffffff',
  metalness: 0.0,
  roughness: 0.0,
  transmission: 0.95,
  ior: 1.5,
});

// Matte plastic (housings, brackets)
part.material({
  baseColor: '#2a2a2a',
  metalness: 0.0,
  roughness: 0.65,
});
```

For schematic coloring (servo, frame, gear, beam, shaft, plate, pin, tool) where
photo-accuracy is not required, the role-token shortcut `.color('servo')` etc.
is sufficient and cleaner. Use `.material()` only when the reference demands it.

### Per-face materials

For parts where different faces need different materials (eyewear rim vs. lens
vs. temple-hinge boss; brushed body + polished crown; etc.), pass a `face`
field referencing a face label declared on a creating op:

```typescript
const frame = box(140, 50, 6, false, {
  faceLabels: { front: 'front', back: 'back', top: 'top' },
});
frame.material({ face: 'front', baseColor: '#0a0a0a', clearcoat: 1, roughness: 0.1 });  // glossy acetate front
frame.material({ face: 'back',  baseColor: '#1a1a1a', roughness: 0.7 });                // matte interior
frame.material({ baseColor: '#cccccc', roughness: 0.5 });                                // default for unlabeled faces
```

Rules:
- `face` must be a label declared upstream via the creator's `faceLabels` option
  (or via `path().label(...)` for sketch-derived shapes).
- Calls accumulate on the shape — multiple `.material({ face: ... })` calls
  build up per-face entries. A second call with the same `face` overwrites.
- A call **without** `face` sets the shape-level default (applies to any face
  not covered by a per-face entry).
- If a label fails to resolve at mesh time (typo, transform stripped lineage,
  no upstream `faceLabels` entry), the build continues and a soft
  `feature.material.face-label-no-match` warning is emitted; the affected faces
  fall back to the shape-level default.
- Per-face identity dies at boolean operations (same as `.color()` and the
  whole-shape `.material()`). Apply per-face materials AFTER all booleans.

## Reference images

`referenceImage(path, opts)` places a reference photo as a plane overlay in the
Studio viewport. It is a virtual node — no OCCT geometry is created, and the
image is hidden during scoring (`--hide-reference-images`).

```typescript
// Front-view overlay (XZ plane) — typical for flat products facing the camera
referenceImage('./reference.jpg', {
  plane: 'xz',
  anchor: 'origin',
  scale: 'fit-bbox',   // auto-scales to match the model's bounding box
  opacity: 0.4,        // ghost behind the model; adjust to taste
});

// Top-down overlay (XY plane) — for PCBs, floor plans, plate layouts
referenceImage('./top-view.jpg', {
  plane: 'xy',
  anchor: 'origin',
  scale: 'fit-bbox',
  opacity: 0.3,
});

// Side overlay (YZ plane) — for profiles, silhouettes from the right
referenceImage('./side.png', {
  plane: 'yz',
  anchor: 'origin',
  scale: { width: 130 },   // explicit width in mm; height auto-computed
  opacity: 0.5,
  flipU: true,             // mirror horizontal if the reference is from the left
});
```

Multiple `referenceImage()` calls are allowed — one per view plane. Path is
resolved relative to the calling `.kcad.ts` file. Supported formats: `.png`,
`.jpg`, `.jpeg`, `.webp`. Validation errors (missing file, bad format, invalid
plane) are pushed as diagnostics on the returned handle rather than thrown.

## Related skills

- `kernelcad-features` — load when adding fillets, chamfers, shells, holes, or cutouts.
- `kernelcad-params` — load when the model needs editable `param()` / `params()` values or live slider support.
- `kernelcad-assemblies` — load for multi-part models with joints, mates, or connectors.
- `kernelcad-nurbs` — load for freeform NURBS surfaces that primitives and sketches cannot express.
- `kernelcad-from-reference` — load when building from a reference photo or visual brief; extends the verification gate set.
- `kernelcad-mcp` — load instead of this skill when you need to introspect a running model dynamically via MCP tools.
