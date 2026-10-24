# kernelCAD authoring reference — API surface

Every top-level function, Shape / Sketch / PathBuilder method, selector algebra, 2D text, constrained sketches, and face labels.

## API Surface

### Before you say "kernelCAD can't make that"

NEVER tell a user a shape is impossible, or that it needs other software, without first calling `lookup_api` and `lookup_cookbook`. kernelCAD does NURBS freeform surfacing — lofts, sweeps, boundary-fill patches, G2 Hermite blends, and variable-section sweeps — so organic forms (body shells, panels, fairings, ergonomic curves, bottles, horns) ARE in scope. Its two real limits, state them precisely and do not overgeneralize past them:
- It is a **solid/NURBS** kernel, not a **polygon/subdivision sculptor** (Blender/Maya).
- Its viewer renders clean CAD, not **photoreal** images — for a photoreal hero shot, export STEP/GLB and finish in a render tool.

For an **organic** vehicle / fairing body, reach for `automotive-body-envelope` (`lookup_cookbook("automotive body envelope")`) — spline/rail loft or surfaceFromCurves + sew + thicken; glass/aero as separate parts. Reserve `loft-body-shell-from-profiles` (`lookup_cookbook("loft a stylized body shell")`) for stylized / mechanism-demo shells only.

### Top-level functions

```typescript
// Editable symbolic parameters. Returned value is a ParamRef accepted anywhere
// the API expects an editable number or boolean. Edit the param() default
// post-build with set_param via MCP / session.params.update in runtime code.
param<T extends number | boolean>(name: string, defaultValue: T, opts?: {
  min?: number;
  max?: number;
  description?: string;
}): ParamRef<T>;
// ParamRef arithmetic uses methods, never JS operators (`+ - * /` throw):
//   const w = param('w', 60), t = param('t', 2);
//   box(w.add(5), w.subtract(t).multiply(2), w.divide(4));
//   // also .negate(), .min(n), .max(n), .abs(), .clamp(lo, hi)
// Hex default ('#rrggbb') = colour param with a picker; pass the ref to
// .color(c) / .finish(t, { color: c }): param('BodyColor', '#3366cc')

params({ width: 60, addCablePort: true }): {
  width: ParamRef<number>;
  addCablePort: ParamRef<boolean>;
};

// Primitives. Each returns a Shape.
// box: default corner-origin, spans [0,x]×[0,y]×[0,z]. centered=true centres ALL
// THREE axes (Z spans -z/2..+z/2) — unlike cylinder, whose bottom stays on z = 0.
// Cavity from z = floor in a corner-origin base:
//   base.subtract(box(x - 2*wall, y - 2*wall, z, true).translate(x/2, y/2, floor + z/2))
box(x: number, y: number, z: number, centered?: boolean, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
// cylinder: centred on the Z axis in X/Y, bottom on z = 0 (spans 0..h). No centered flag.
cylinder(h: number, r: number, segments?: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery> }): Shape;
sphere(r: number): Shape;  // centred on the origin; faceLabels NOT accepted — sphere has no canonical faces

// Extrusion helpers — profile defined inline, extruded along Z. All four
// accept opts.twistAngle (deg; number or ParamRef): the profile rotates about
// the profile origin through the sweep. Unknown option keys throw
// feature.invalid-args.
extrudeRect(w: number, h: number, height: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery>; twistAngle?: Editable<number> }): Shape;
extrudeCircle(r: number, height: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery>; twistAngle?: Editable<number> }): Shape;
extrudePolygon(points: Array<[Editable<number>, Editable<number>]>, depth: Editable<number>, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery>; twistAngle?: Editable<number> }): Shape;
extrudeRoundedRect(width: number, height: number, radius: number, depth: number, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery>; twistAngle?: Editable<number>; axis?: 'x' | 'y' | 'z' }): Shape;
// axis defaults to 'z' (profile in XY, sweep +Z). 'x': width on Y / height on Z,
// sweep +X. 'y': width on X / height on Z, sweep +Y.

// 2D polygon + mask-prism helpers. Since the examples hand-roll these, use the
// built-ins: filletPolygon rounds any closed polygon (CW/CCW, convex/reflex),
// then feed the points to extrudePolygon or a prism helper.
filletPolygon(points: [number, number][], radius: number, opts?: { segments?: number }): [number, number][];
prismSide(points: [number, number][], halfY?: number): Shape;        // points (s, z), spans Y -halfY..+halfY (default 1200)
prismSideY(points: [number, number][], y0: number, y1: number): Shape; // points (s, z), spans y0..y1
prismFront(points: [number, number][], x0: number, x1: number): Shape; // points (Y, Z), spans x0..x1
prismPlan(points: [number, number][], z0: number, z1: number): Shape;  // points (X, Y), spans z0..z1

// Path builder — chain moveTo / lineTo / arcs / .close() to get a Sketch. For
// revolved geometry (washers, donut bodies, mug profiles, etc.) build a profile
// via path() and call .revolve() on the resulting Sketch.
path(): PathBuilder;

// Boolean union of two or more shapes (top-level alternative to .union()).
union(...shapes: Shape[]): Shape;

// Inspectable mechanical assembly intent. Captures parts and joints as records.
// Call .model() to return one fused/exportable Shape of all placed parts.
assembly(name?: string): Assembly;

// Helix rail for Sketch.sweep. radius / pitch / turns / startAngle accept
// Editable<number>; the rail remembers them, so a sweep along it follows param
// changes and sweep(rail, { spine: 'helix' }) can build the exact helix.
helix({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }): [number, number, number][];

// ISO metric threads (see "Threads" below). isoThread('M6') -> { spec: 'M6x1',
// diameter, pitch, minorDiameter, tapDrill, ... }; 'M6x0.75' / 'M70x4' set the pitch.
isoThread(spec: string): IsoThreadInfo;
// Real external thread along +Z, z = 0..length, ONE sweep (M6 x 20 ~2-3 s).
threadedRod({ spec, length, chamfer?: boolean | number, cosmetic?: boolean, clearance? }): Shape;
// 3D Bezier curve (3 points = quadratic, 4 = cubic) -> Curve3D.
bezier(points: [number, number, number][]): Curve3D;

// Edge selection — lowers the shape lazily (awaitable).
// selectEdges returns a ShapeList: still an EdgeSegment[] (fillet/chamfer accept
// it directly), plus the selector algebra described under "Selector algebra" below.
selectEdges(shape: Shape, query?: EdgeQuery): Promise<ShapeList<EdgeSegment>>;
selectEdge(shape: Shape, query: EdgeQuery): Promise<EdgeSegment>;  // throws if zero or multiple match

// Selector algebra — wrap ANY array of topology query results (face summaries,
// q.face(...).evaluate(scene) results, a hand-built list) so the sort/group/filter
// methods apply. selectEdges already returns one.
select<T>(items: Iterable<T>): ShapeList<T>;

// Parts library — geometry import. Every from* call resolves the path relative
// to the calling .kcad.ts file (absolute paths also accepted) and returns the
// standard capture-proxy Shape — composes with translate/rotate/color and
// arm.part(...) like any primitive.

// STEP — the default for vendor catalog components.
lib.fromSTEP(path: string): Promise<Shape>;

// Native BREP — lossless (exact analytic surfaces and full topology, no
// schema translation, no tessellation). Every downstream op is valid on the
// result. Use STEP to interchange with other CAD systems.
lib.fromBREP(path: string): Promise<Shape>;

// STL (ASCII or binary) — THIS IS A MESH, NOT ANALYTIC B-REP. Triangles are
// sewn back into topology and promoted to a solid when they close, so
// booleans / volume / mass properties / bbox / export all work. But the faces
// stay planar facets: a hole that was a cylinder in the source CAD is now a
// fan of quads, so fillet/chamfer on a "curved" edge, canonical face refs and
// hole detection will NOT behave as they do on STEP/BREP input. Prefer
// fromSTEP/fromBREP whenever the source is available.
// A non-watertight mesh is REFUSED by default rather than silently returned as
// an open shell whose volume and booleans would be meaningless.
lib.fromSTL(path: string, opts?: {
  tolerance?: number;     // vertex-merge distance, mm (default 1e-6); raise for
                          // third-party meshes with non-bit-identical vertices
  allowOpen?: boolean;    // accept a non-watertight mesh as an open shell
  maxTriangles?: number;  // cost cap (default 200000; import is ~0.45 ms/triangle)
}): Promise<Shape>;

// Full-detail, display-only mesh import. This skips BRep sewing and does not simplify.
// Rigid transforms, assembly placement and finish/color are supported; solid
// operations and topology queries are not.
lib.meshFromSTL(path: string): Promise<Shape>;

// Full-detail, display-only STL import (no BRep sewing or simplification).
// Rigid transforms, assembly placement, finish and color are supported.
lib.meshFromSTL(path: string): Promise<Shape>;

// Reference-image overlay — virtual node (no solid). The renderer draws
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
// around the world Y axis. Virtual record — display only.
// Default behavior (script never calls this) is the existing three-light
// rig. Multiple calls register multiple records; the renderer applies the
// last one.
setRenderEnvironment(spec: {
  preset?: 'studio' | 'softbox' | 'neutral' | 'outdoor' | 'warehouse';
  url?: string;
  intensity?: number;  // (0, 100], default 1.0
  rotation?: number;   // degrees around Y, default 0
}): RenderEnvironmentHandle;

// Override the camera look-at target for `setRenderPose` and headless
// engineering renders. Default is the bbox centroid; that auto-fit skews
// when a build has tall asymmetric features (pocket-watch with pendant +
// bail above origin, scope with offset eyepiece, lamp with tall shaft).
// Pass an explicit (x, y, z) in the script's world frame to re-aim the
// camera; the renderer translates it into its recentered scene frame
// automatically. Virtual record — display only. Multiple
// calls register multiple records; the renderer applies the last one.
setCameraTarget(x: number, y: number, z: number): CameraTargetHandle;

// Override the camera framing distance (mm from target). Convenience wrap
// over setCameraTarget's optional `distance` field — inherits the most
// recent target (or world origin when no setCameraTarget call has
// happened) and pins the camera at the supplied distance along the pose
// direction. Use when the auto-fit extents-projection reads too tight or
// too loose at the chosen pose / aspect.
setCameraDistance(distance: number): CameraTargetHandle;

// Declare an animation timeline for offline kinematic-motion MP4 capture.
// Two author-surface forms — both normalize to the same stored track shape,
// captured by `kernelcad animate` / the `capture_animation` MCP tool (full
// authoring contract in the "Animation timelines" section below):
//
//   1. Legacy sweep — ONE previously-declared `param()` swept linearly from
//      `from` to `to` over `durationMs` ms (normalizes to a two-key linear
//      track):
animationView(spec: {
  param: string;
  from: number;
  to: number;
  durationMs: number;
  fps?: number;          // default 30
}): AnimationViewHandle;

//   2. Keyframe tracks — several params on one shared timeline. Each track
//      animates one `param()` through `{ atMs, value, ease? }` keys. `ease`
//      applies to the segment ENDING at that key (default 'linear'); the
//      value HOLDS before the first key and after the last (clamp). Total
//      duration is the max `atMs` across all tracks.
animationView(spec: {
  name?: string;         // optional human label, e.g. 'dispense cycle'
  tracks: Array<{
    param: string;       // a NUMERIC param() declared earlier; one track per param
    keys: Array<{
      atMs: number;      // >= 0, finite, unique within the track
      value: number;     // clamped to the param's declared min/max (warn on clamp)
      ease?: 'linear' | 'step' | 'easeIn' | 'easeOut' | 'easeInOut';  // default 'linear'
    }>;
  }>;
  fps?: number;          // default 30
}): AnimationViewHandle;
// Virtual record — display only. Every animated param MUST be declared
// NUMERIC by a prior param() call; undeclared/non-numeric params, two tracks
// on the same param, and malformed keys (empty tracks/keys, non-finite or
// negative atMs, duplicate atMs, unknown ease) THROW KernelError
// (`animation.param.unknown` / `animation.track.duplicate-param` /
// `animation.keys.invalid`). Out-of-range key values clamp to the param
// boundary with an `animation.value.clamped` warn. Multiple animationView()
// calls register multiple records; capture uses the LAST one and the later
// record carries an `animation.view.shadowed` warn naming the shadowed ids.

// Declare printability (design-for-manufacture) gates for the model.
// Declaration-only: registers a virtual record (display only);
// enforcement runs on every `evaluate` / `evaluate_script` once a dfmSpec
// record is present. At least one of minWall / minClearance / channels is
// required. Malformed declarations THROW KernelError
// (`feature.invalid-args`) rather than stashing diagnostics — dfmSpec is
// an enforcement gate, and a silently-disabled gate is worse than a build
// failure. Multiple calls register multiple records; the last one wins
// (same convention as setRenderEnvironment). Full semantics: see the
// "DFM gates (print readiness)" section below.
dfmSpec(spec: {
  minWall?: number;       // mm — min printed wall thickness per non-excluded part
  minClearance?: number;  // mm — min distance between distinct parts
  includeArticulatedMates?: boolean; // also measure non-fastened mates at rest; requires minClearance
  ignore?: [string, string][];  // part-name pairs exempt from clearance (design-intent contacts)
  exclude?: string[];     // non-printed parts (vendor STEP, electronics); trailing-'*' glob per entry
  channels?: Array<{
    part: string;         // owning part name (single-shape scripts: 'shape')
    name: string;         // author-facing label, echoed in diagnostics
    openings: number;     // expected count of distinct mouth openings to the outside
    sealed?: boolean;     // intentionally sealed internal void (openings must be 0)
  }>;
}): DfmSpecHandle;
```

### Selector algebra (ShapeList)

`EdgeQuery` / `FaceQuery` are flat predicate bags: they answer *"which entities
match these constraints?"*. They cannot answer *"the highest three faces"*,
*"the largest bore"*, or *"one group per Z level"*. `ShapeList` is the other
half — sort / group / filter over results the kernel has ALREADY resolved.

Compose the two, don't substitute one for the other: let the declarative query
filter in the kernel first, then rank or bucket the resolved list in TypeScript.

```typescript
// selectEdges returns a ShapeList; select(...) wraps any other result array.
const edges = await selectEdges(body, { convex: true });

edges.sortBy('Z').last                       // topmost edge
edges.sortBy('Z', { descending: true }).take(3)   // highest three
edges.filterBy('CIRCLE').sortBy('radius').last    // largest circular edge
edges.filterBy('Z')                          // edges running parallel to +Z
edges.filterByPosition('Z', 8, 10)           // edges in the top 2 mm slab
edges.sortByDistance([0, 0, 20]).first       // nearest to a point
edges.filterBy((e) => e.length > 5)          // arbitrary predicate

const levels = edges.groupBy('Z', { tolerance: 0.01 });  // one group per Z level
levels.length; levels.keys;                  // 3, [0, 5, 10]
levels.at(-1);                               // top level (ShapeList)
levels.byKey(10);                            // same group, looked up by value
```

Contracts worth knowing:

- **Immutable.** Every method returns a NEW list; nothing sorts in place.
- **Identity survives.** The algebra reorders the SAME descriptor objects — it
  never re-derives one — so `EdgeSegment.id` and the `@kc[...]` ref
  handle on a `ResolvedEntity` are intact after any sort or group.
- **Float-noise tolerant.** Both `sortBy` and `groupBy` compare on a quantized
  metric (1e-6 by default, or an explicit `tolerance` in mm) with the incoming
  position as tiebreak, so kernel noise cannot flip an order or split one Z
  level into two groups. `byKey` quantizes the request identically.
- **It is still an array.** `ShapeList` extends `Array`, so `.length`,
  indexing, spread, `for..of` and `.map` / `.filter` all work, and a
  `ShapeList<EdgeSegment>` passes straight into `fillet` / `chamfer`.
- **`radius` is CIRCLE-only.** `sortBy('radius')` needs `EdgeSegment.radius`,
  which is populated for `curveType === 'CIRCLE'` and deliberately absent
  otherwise; asking for it elsewhere throws rather than approximating.

### Shape methods (chainable)

Transforms mutate the shared `Shape` handle, including geometry already passed
to `assembly.part`. `const other = shape` does not make a copy: translating either
name moves the same source for every part that uses it. For repeated parts, keep
the prototype unmodified and use separate `assembly.part(name, prototype, { at })`
placements with connectors and mates, or call a geometry factory for each part.
Check world-frame spacing after reuse changes. The authoring `Shape` API has no
`.clone()` method; backend clone methods are not script methods.

```typescript
// Transforms (mutate-then-return-this; chain freely):
.translate(x: Editable<number>, y: Editable<number>, z: Editable<number>): Shape
.rotate(
  axis: [Editable<number>, Editable<number>, Editable<number>],
  degrees: Editable<number>,
  pivot?: [Editable<number>, Editable<number>, Editable<number>],
): Shape
// Cardinal-axis aliases for .rotate — prefer these for the common cases:
.rotateX(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]): Shape  // .rotate([1, 0, 0], ...)
.rotateY(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]): Shape  // .rotate([0, 1, 0], ...)
.rotateZ(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]): Shape  // .rotate([0, 0, 1], ...)
// Uniform (single positive finite number) or per-axis Vec3 (non-uniform sx/sy/sz).
// Non-uniform lowers via gp_GTrsf + BRepBuilderAPI_GTransform so face refs survive
// (topology preserved under any affine transform). All factors must be positive
// and finite; otherwise feature.invalid-args.
.scale(factor: number | [number, number, number]): Shape

// Orient this shape so its current +Z axis aligns with `axis`. Sugar over .rotate() —
// preferred for cross-axis cylinders/axles. Identity [0, 0, 1] is a no-op; antipodal
// [0, 0, -1] is a deterministic 180° around X. Zero vector throws feature.invalid-args.
.alongAxis(axis: [number, number, number]): Shape

// Bounding-box query + placement normalizers — ESSENTIAL for placing fetched
// catalog parts. A `lib.fetchPart(ref)` STEP arrives at its own arbitrary
// native origin; box(l,w,h) is corner-origin (min corner at 0,0,0). Without
// normalizing, .translate(x,y,z) just nudges a part from wherever the STEP
// authored it, so real parts scatter/overlap. These three fix that. All async
// (they lower the shape to read its real AABB) — `await` them.
//
// AABB in the CURRENT world frame (after every transform appended so far), mm:
.boundingBox(opts?: { exact?: boolean }): Promise<{ min: [number,number,number]; max: [number,number,number]; size: [number,number,number]; center: [number,number,number] }>
// Translate so bbox center → world origin; returns this Shape for chaining.
// After recenter(), a following .translate(x,y,z) places the part's CENTER at
// (x,y,z). Pass { z:false } etc to recenter only the named axes.
.recenter(opts?: { x?: boolean; y?: boolean; z?: boolean }): Promise<Shape>
// Seat on the z=0 floor (bbox min.z → 0), centered in x/y; returns this Shape.
// { center:false } drops onto z=0 without moving x/y.
.seatOnFloor(opts?: { center?: boolean }): Promise<Shape>
//
//   // Place a fetched servo so its CENTER lands at (20, 0, 0):
//   const servo = await lib.fetchPart('sg90-servo');
//   (await servo.recenter()).translate(20, 0, 0);
//   // Stand a part upright on the build plate:
//   (await bracket.seatOnFloor());

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
// Draft — taper faces for mold release (Slice E). angleDeg: 0–90.
// neutralPlane defaults to the selected face; pullDir defaults to face normal.
.draft(angleDeg: Editable<number>, opts: { face: FaceSelector | string; neutralPlane?: string; pullDir?: [number, number, number] }): Shape

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
.lower() — internal; do not call from a script
```

`EdgeSelector = EdgeQuery | EdgeSegment[] | { face: string | FaceQuery } | undefined`
`FaceSelector = CanonicalFace | string (label) | FaceQuery`
`CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'`

**Declare drawing review** with `shape.drawingReview(plan)` to bind required geometric callouts and engineering decisions to this shape and downstream mechanical drawings. The plan has `id`, `requirements: [{ id, featureId, annotationId: 'authored:<dimension id>', expectedKind: 'linear' | 'diameter' | 'radius' | 'angular', role: 'critical' | 'reference', reason }]` and `decisions: [{ id, kind: 'datum' | 'fit' | 'tolerance' | 'dimension' | 'other', featureId, prompt, resolution?: { note, provenance } }]`. Both arrays are required; at least one must contain an entry. Unknown fields, empty strings and duplicate IDs reject. This virtual declaration returns the same shape and creates no geometry. See `kernelcad-drawings` for export review options and statuses. Coverage proves declared callout presence; it does not certify fits, tolerances or manufacturing.

**Declare dimensions** the viewer should show with `shape.dimension(spec)`: optional nonempty `id` gives its stable `authored:<id>` drawing identity; a declaration only, it returns the same shape and adds no geometry. `{ kind: 'linear', from, to, label? }` measures between two anchors, each a point `[x, y, z]`, `{ edge: EdgeQuery }` or `{ face: FaceQuery }`; a circular edge anchor means the circle centre, so two holes give their centre distance. `{ kind: 'diameter' | 'radius', edge, label? }` calls out one circular edge (`Ø5`, `R3`). `{ kind: 'angular', from, to, label? }` measures between two edges. A label is a name, not a number: a linear dimension reads `<label> <value>` (`hole spacing 30`), so never type the number into the label. Declared dimensions turn the viewer's Dimensions toggle on by default, and a shared project link with `?dims=1` forces it on. `evaluate_script` returns them as `dimensions: [{ text, kind, source }]`, so check the text before you publish. Recipe: `dimension-callouts`.

```typescript
const holeAt = (x: number, y: number) => ({ edge: { ofCurveType: 'CIRCLE' as const, near: [x, y, 6] as [number, number, number] } });
const plate = box(60, 40, 6)
  .holes('top', { positions: [{ u: -15, v: 0 }, { u: 15, v: 0 }], diameter: 5, depth: 'through' })
  .threadedHole('top', { u: 0, v: 12, spec: 'M5', depth: 8 }) // ISO tapped hole by designation; modeled: true cuts the thread
  .dimension({ kind: 'linear', from: holeAt(15, 20), to: holeAt(45, 20), label: 'hole spacing' }); // "hole spacing 30"
```

### Sketch methods

A `Sketch` is produced by `path()...close()`. All Sketch methods return a `Shape` (or another `Sketch` for `reflect`).

```typescript
// Extrude closed sketch normal to its plane by `depth` (mm; number or ParamRef).
// twistAngle (deg; number or ParamRef) is real twisted-extrude geometry: the
// profile rotates about the sketch origin through the sweep, so a profile that
// does not touch the origin changes its bounding box. Face-bound extrudes
// (projectCurve output) reject a non-zero twist with feature.invalid-args,
// as does any unknown option key.
.extrude(depth: Editable<number>, opts?: { faceLabels?: Record<string, CanonicalFace | FaceQuery>; twistAngle?: Editable<number> }): Shape

// Revolve around the Z axis (360 degrees unless angleDeg; number or ParamRef).
// Profile coords are (radial-X, axial-Z); all x >= 0.
.revolve(opts?: { angleDeg?: Editable<number> }): Shape

// Sweep this profile along a 3D rail.
// spine: 'polyline' (default) keeps real corners — pipe runs, L-bends;
//   transitionMode ('right' | 'transformed' | 'round') picks how those corners are bridged.
// spine: 'smooth' builds ONE B-spline spine through the rail points and places the
//   profile at the rail start — REQUIRED for rails that sample a smooth curve
//   (helix(...), threads, organic paths). A polyline spine on a dense smooth rail
//   produces per-segment tubes that do not sew and fail the watertight export verify.
// spine: 'helix' (rails from helix(...) only) sweeps along the EXACT helix by
//   screw motion — the mode for threads, worms and helical grooves. The profile is
//   read in the AXIAL plane through the rail start: profile x = radial offset from
//   the helix point (+ = away from the axis), profile y = offset along the axis. A
//   60° ISO V thread section sweeps to a valid solid. Keep the profile's axial
//   extent below the pitch and off the axis, or lowering fails with
//   feature.invalid-args. frenet / transitionMode do nothing here.
// frenet: true rotates the profile with the rail curvature.
// section: 'transverse' (spine 'helix' only): the profile is the cross-section
//   PERPENDICULAR to the axis, sketch origin on the axis — a twisted extrusion that
//   turns once per pitch (how threadedRod builds a whole rod without a boolean).
.sweep(rail: [number, number, number][], opts?: { frenet?: boolean; transitionMode?: 'right' | 'transformed' | 'round'; spine?: 'polyline' | 'smooth' | 'helix'; section?: 'axial' | 'transverse' }): Shape

// Loft through one or more additional sections to produce a 3D solid.
// Use for nozzles (round-to-square), wings, fairings, transition pieces,
// twisted blades and staggered stacks.
// opts.spacing stacks sections on XY planes at z = 0, spacing, 2*spacing, ...;
// of the rotation controls only twistDeg/twistCenter apply there (per-plane
// rotationDeg requires opts.planes). opts.planes overrides with explicit
// per-section placement and each entry may add rotationDeg. Unknown option
// keys (top-level or per-plane) throw feature.invalid-args.
.loft(other: Sketch | Sketch[], opts?: {
  spacing?: Editable<number>;
  planes?: { plane: 'XY' | 'YZ' | 'XZ'; origin: [Editable<number>, Editable<number>, Editable<number>]; rotationDeg?: Editable<number> }[];
  twistDeg?: Editable<number>;
  twistCenter?: [Editable<number>, Editable<number>];
  ruled?: boolean;
  startPoint?: [Editable<number>, Editable<number>, Editable<number>];
  endPoint?: [Editable<number>, Editable<number>, Editable<number>];
  faceLabels?: Record<string, CanonicalFace | FaceQuery>;
  rails?: Curve3D[];
}): Shape

// Reflect this sketch's path across an axis, returning a new Sketch.
// 'x' negates y-coords; 'y' negates x-coords; { axis, offset } reflects across a parallel axis.
// Arc winding is inverted automatically. Labels are preserved. Reflection stays
// symbolic: ParamRef coords (and a ParamRef offset) reflect to ParamRef
// expressions, so the reflected sketch tracks param edits.
.reflect(axis: 'x' | 'y' | { axis: 'x' | 'y'; offset: Editable<number> }): Sketch
```

**Twisted blades / staggered sections.** Two ways to twist a loft. `twistDeg` distributes an even total twist across the sections — first section at 0°, last section at `twistDeg`. A per-plane `planes[].rotationDeg` overrides the distributed angle for that section only (`rotationDeg ?? twistDeg * i / (N - 1)`). Both rotate in section space about `twistCenter` (default `[0, 0]` — the sketch-local origin of each section, NOT the 3D plane `origin` you passed in `planes`), which is how a turbine blade profile is rotated about its stacking axis. In non-rail lofts, sections built from NURBS path segments (`.spline` / `.nurbsSegment` / `.hermiteG2`) honor `plane`, `origin`, and rotation exactly like ordinary sections. The twist option name differs by operation: extrude twists with `twistAngle`, loft with `twistDeg`.

```ts
// Twisted blade: two sections, the tip rotated 30° about its stacking center.
const root = path().moveTo(-6, -1).lineTo(6, -1).lineTo(6, 1).lineTo(-6, 1).close();
const tip  = path().moveTo(-3, -0.5).lineTo(3, -0.5).lineTo(3, 0.5).lineTo(-3, 0.5).close();
const blade = root.loft(tip, {
  planes: [
    { plane: 'XY', origin: [0, 0, 0], rotationDeg: 0 },
    { plane: 'XY', origin: [0, 0, 40], rotationDeg: 30 },
  ],
  twistCenter: [0, 0],
});
```

**Rail-guided loft limitation.** `opts.rails` currently neither supports section rotation (any non-zero `twistDeg` or `rotationDeg` is rejected with a `feature.invalid-args` lowering error) nor applies `planes[].origin` to NURBS sections — use line/arc section sketches or drop the rails if you need either.

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
.spline(points: Array<[Editable<number>, Editable<number>]>, opts?: { tension?: Editable<number> }): PathBuilder    // Include current pen position as points[0]. Verify the resulting bounds: dense sharp turns can overshoot; use bounded piecewise Bezier curves for dimension-controlled silhouettes. See kernelcad-nurbs.
.nurbsSegment(controlPoints: Array<[Editable<number>, Editable<number>]>, opts?: { degree?: number; weights?: number[]; knots?: number[] }): PathBuilder  // (Slice D) Explicit B-spline control polygon — controlPoints[0] must match current pen. See kernelcad-nurbs.
.bezierTo(c1: [Editable<number>, Editable<number>], c2: [Editable<number>, Editable<number>], end: [Editable<number>, Editable<number>]): PathBuilder  // Exact cubic Bezier (SVG C) from the pen.
.quadraticTo(c: [Editable<number>, Editable<number>], end: [Editable<number>, Editable<number>]): PathBuilder  // Exact quadratic Bezier (SVG Q) from the pen.
.hermiteG2(a: HermiteEndpoint2D, b: HermiteEndpoint2D): PathBuilder  // (Slice D) 2D quintic-Hermite G2 transition. See kernelcad-nurbs.
.tangentCircle(entities: TangentEntity2D[], opts?: { radius?: Editable<number>; near?: [Editable<number>, Editable<number>] }): Sketch  // Circle TANGENT to other geometry. 2 entities + opts.radius = sketch-fillet; 3 entities, no radius = through-three. Terminal, like circle().
.tangentLine(a: TangentEntity2D, b: TangentEntity2D, opts?: { near?: [Editable<number>, Editable<number>] }): PathBuilder  // Segment along the line tangent to two circles — the belt/pulley move. Both entities must be circles.
.label(name: string): PathBuilder               // Tag the prior segment for fillet/chamfer/shell by name.
.close(): Sketch                                // Close path; returns a Sketch.
```

`tangentCircle` / `tangentLine` take entities of the form `{ kind: 'line', from: [x,y], to: [x,y] }` (an INFINITE line; `from`->`to` sets direction) or `{ kind: 'circle', center: [x,y], radius }`, each with an optional `side: 'outside'` (default) `| 'enclosed' | 'enclosing' | 'unqualified'`. Points are not supported. These constructions have SEVERAL solutions (a radius-r circle tangent to two perpendicular lines has four, one per quadrant). `side` filters first, `opts.near: [x,y]` then picks the closest solution, and if more than one still survives the build FAILS with `sketch.tangency.ambiguous` listing every candidate rather than guessing. No such construction existing fails with `sketch.tangency.no-solution` naming the geometric reason.

Every PathBuilder coord and scalar accepts `Editable<number>` (`number | ParamRef<number>`), so symbolic params survive into capture and the dispatcher's pre-resolve substitutes them at lower time. That includes `.circle(cx, cy, r, segments?)` (each vertex is captured as `cx + r·cos θ`; `segments` stays a plain integer), `tangentCircle` / `tangentLine` entity coordinates and radii, and the `extrude` / `revolve` / `loft` / `reflect` scalars above. Capture-time checks read the param's current value, not a placeholder. Raw `sweep` rail arrays stay numeric; a rail from `helix(...)` is the parametric one. Build derived dimensions with the ParamRef arithmetic methods (`.add`, `.subtract`, `.multiply`, `.divide`, `.negate`, `.min`, `.max`, `.abs`, `.clamp`).

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

- `inspect({ of: 'constraints', constraints? })` — discover the supported types and echo the current constraint list.
- `add_constraint({ constraints?, constraint })` — validate one constraint and return a new list; no session state is mutated.
- `solve_sketch({ entities, constraints })` — solve a 2D constraint set and return `{ ok, entities, constraints }` or validation errors; no script is modified.

Entity and selection recovery:

- If a constraint references a missing id, list the entity ids you are passing and fix the `entities` array before solving.
- If a `LINE` references non-POINT endpoints or a `CIRCLE` references a non-POINT center, replace the referenced id with a `POINT`.
- If a constraint reports the wrong entity count, check the type arity: most types use 2 entities; `RADIUS` uses 1, `ANGLE` uses 1 or 2, and `SYMMETRIC` uses 3.
- If `DISTANCE`, `RADIUS`, or `ANGLE` reports a missing value, add a numeric `value`.
- If the type is unsupported, call `inspect({ of: 'constraints' })` or `lookup_api({})` and choose one of the supported types above.

## Threads

ISO metric threads.

- Designations: `'M6'` = coarse pitch from the ISO 261 table (M1–M64); `'M6x0.75'` sets the pitch and works for any size (`'M70x4'` jar neck). `isoThread(spec)` returns the numbers (pitch, minor/pitch diameter, tap drill) for callouts and clearance holes.
- External thread: `threadedRod({ spec, length })` — real 60° profile along +Z from z = 0, one helical sweep, valid solid, STEP-exportable. `chamfer: true` for 45° ends (one more boolean), `cosmetic: true` for an instant major-diameter cylinder with the spec in metadata, `clearance` (≤ pitch/10) for printed fits. Union a head for a bolt; union onto a body for a neck.
- Internal thread: `body.threadedHole(face, { u, v, spec, depth })` — same frame and refs as `hole`. Default cosmetic (minor-diameter bore + recorded thread, fast); `modeled: true` cuts the real thread (seconds), with `clearance` (≤ pitch/8) of play.
- Mating in phase: the rod's ridge crosses +X at every z = k·pitch and a modelled hole's groove crosses its face u-axis at the entry face, so put the hole's entry face on a whole pitch of the rod (e.g. lift the nut by k·P). Verify with `verify({ check: 'dfm' })` / interference — a cosmetic hole on a modelled rod reports interfering, as it should.
- Example: `examples/threads/threaded-jar-and-lid.kcad.ts` (M64 × 4 neck + tapped lid).

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

Discover labels on a script with the `inspect({ of: 'face-labels' })` MCP tool — it surfaces both `faceLabels`-declared labels (creating-op metadata) and sketch-segment labels (`path().label('rim')`).
