---
name: kernelcad-authoring
description: kernelCAD model authoring API — primitives, transforms, booleans, sketches, path-builder, sketch-text, return-single-shape rule, conventions, CLI commands, and verification gates. Load this when writing or modifying .kcad.ts geometry.
---

# kernelCAD — authoring

Author or modify kernelCAD models in TypeScript. Scripts live in `.kcad.ts` files; the kernelCAD CLI (`kernelcad evaluate <file>` and `kernelcad export stl|step|dxf|3mf|glb <file> -o <out>`) executes them via an OpenCASCADE WASM kernel.

## Agent authoring loop

Use this loop for every non-trivial model edit:

1. **Classify the job**: blockout, production-ish part, reference replication, assembly/mechanism, sheet metal, or standard-part integration. Load the matching specialty skill before editing.
2. **Write the design brief in plain engineering terms**: purpose, external dimensions, interfaces, materials/finish if relevant, moving parts, manufacturability assumptions, and what must be proven. If the request is ambiguous on load-bearing parameters — overall dimensions, units, symmetry, part count, fit/clearance targets — ask 1–3 targeted clarifying questions BEFORE generating geometry; if you proceed anyway, list each assumption in the brief and encode it as a named `param()` so the user can correct it without a rewrite.
3. **Map words to geometry**: turn important prompt phrases into named source sections, parameters, parts, connectors, materials, or tests so the generated model stays traceable to the user's words.
4. **Plan parameters and artifacts**: identify the `.kcad.ts` source file, named parameters, imported STEP files, expected exports, and the smallest verification command set before writing geometry.
5. **Edit source only**: treat `.kcad.ts`, prompt/brief markdown, and provenance metadata as source. Do not hand-edit generated PNG, MP4, STEP, STL, score JSON, or capture metadata.
6. **Generate explicit targets**: run the exact render/export/capture command for the requested artifact. Avoid broad directory refreshes unless the task is a release/demo rebuild.
7. **Validate deterministically**: run `kernelcad evaluate`, relevant exports, assembly/review tools, interference checks, and scorer gates before accepting visual evidence.
8. **Inspect visual artifacts honestly**: when a PNG/MP4/render is produced, open/read it and report what is visible. If the image shows wrong proportions, floating parts, occlusion, unreadable details, or a bad camera crop, repair source and regenerate.
9. **Packetize visual evidence**: when visual evidence matters, run `kernelcad render inspect <file> <outDir>` to produce a deterministic inspection bundle: a manifest naming the source file, command, generated artifacts, and caveats, plus canonical RGB views. Add `--channels rgb,mask,depth,normals` when machine-readable object masks, depth, or view-space normals are needed. Use `--focus <names>` or `--hide <names>` to isolate feature ids or assembly part names when clutter would obscure the check. Keep richer channels in the same manifest packet; do not replace the canonical RGB views.
10. **Repair one cause at a time**: target the smallest source change that addresses the failing check, then rerun the same check. Do not loosen gates or silently skip failing evidence.

**Verify against geometry, not against your own summary.** Trust measured
evidence — exact bbox/volume from `inspect({ of: 'shape' })`/`inspect({ of: 'step' })`, interference
volumes, DFM findings, the rendered pixels — over the narrative of what the
script "should" have built. A green `evaluate` (`ok: true, featureCount: N`)
proves the script ran, not that the geometry is correct. When a check cannot
measure a thing (kernel error, unknown clearance status, an inconclusive
render), treat that uncertainty as a failure to resolve, not a pass to assume.

## Inner loop: render after every visible change

The authoring loop above is the *outer* loop. The *inner* loop runs after every feature you add that you expect to see in the rendered output. Skipping the inner loop is the single biggest cause of "tests green, output wrong" shipments.

After every one of these operations, render and look at the result:

- a new `subtract(...)` that should produce a visible hole, notch, or relief
- a new `union(...)` of shapes that should carry distinct materials
- a `material({...})` change on a body that should be visually distinct from its neighbors
- a new sketch + `extrude` whose orientation matters (i.e. anything front-facing)
- a parameter retune that should visibly move a feature

The minimum check:

```bash
node dist/cli/index.js render <file> -o /tmp/check.png --pose <scorer-pose> --hide-reference-images
```

Pick the pose the scorer uses (look in the task's `harness.ts` for `REFERENCE_POSE` — typically `30,15` for canonical 3/4 product shots). Render at default views (no `--pose` flag) only when you specifically want the front/right/top/iso composite — that view often hides defects visible at the scorer pose.

When you open the rendered PNG, ask three questions:

1. **Is the feature I just added visibly present?** If the subtract didn't punch through, the union didn't show a color delta, or the material change didn't render, the eval-harness JSON of `ok: true, featureCount: N` is lying about success. Fix the geometry, don't ship.
2. **Are features I didn't intend to change still where they were?** Material chaining, sketch reuse, and chained booleans regularly corrupt earlier features silently. Compare against the previous render.
3. **Does the silhouette match the reference at the same pose?** Not pixel-perfect — but the right number of openings, right proportions, right shape category.

If a render shows wrong proportions, hidden openings, floating parts, or unreadable details, repair `.kcad.ts` source and re-render. Do not pile features on top of broken geometry. Do not declare done until the most recent render shows the intent.

Common inner-loop traps are catalogued in the cookbook at
`kernelcad-nurbs/cookbook/snippets/your-first-real-build-anti-patterns.md`
(orientation defaults, sketch-axis sign flips, material-shadowing on union,
two-feature placement math, subtract-chain reliability, JSON-`ok`-is-not-visual-proof).

## Assembly and mechanism loop

### Articulated-digit workflow (non-bypassable)

For an articulated digit, use the structural joint helper and complete every gate below:

<!-- ARTICULATED_DIGIT_EXAMPLE:START -->
```typescript
const arm = assembly('index-digit');
const minClearance = 0.1;
const parentMount = 'palm.index-mount';
const frame = { origin: [0, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] };
const segments = [
  { name: 'proximal', lengthMm: 54, widthMm: 14, depthMm: 14, terminal: true },
];
const joints = [
  { name: 'mcp', limitsDeg: [0, 27], style: { knuckleR: 5.4, forkGapY: 10, pinCapThickness: 3 } },
];

arm.part('palm', box(20, 50, 20, true).translate(-10, 0, 0))
  .connector('index-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 10] },
  });

joint.articulatedDigit(arm, {
  name: 'index',
  parentMount,
  frame,
  clearanceMm: minClearance + 0.1,
  segments,
  joints,
});

dfmSpec({ minClearance, includeArticulatedMates: true });

return arm.solvedModel({}, { validate: 'error' });
```
<!-- ARTICULATED_DIGIT_EXAMPLE:END -->

- Run the full `review_cad` review, including pose-envelope clearance and interference checks.
- Confirm visual fit separately: every digit link and moving mate must remain outside package keepouts across the reviewed pose envelope.
- Dynamics, load, and actuation claims are unverified without explicit evidence; articulated-digit geometry and clearance review do not certify payloads or actuation.
- These steps are mandatory. Do not bypass the helper, DFM declaration, pose-envelope review, keepout fit check, or evidence requirement by substituting raw offsets or a visual-only pass.

### Think in parts

- Every physically distinct component is a named `assembly().part(name, shape)` — one body per part unless the component is genuinely monolithic.
- Anonymous loose top-level bodies in a multi-body model are a defect smell: the review loop emits `assembly.structure.unstructured-bodies` (info) with the recovery hint. Wrap each loose body in a named part.
- Part names are the durable handles for `inspect --focus`, `inspect({ of: 'part-stats' })`, and Studio's hide / keep-whole / per-part validity — choose stable, descriptive names.

- If a model has moving parts, design the joint structure before styling: name the parent/child parts, joint type, axis/frame, limits, and editable pose parameters up front.
- If two parts are intended to touch, author the relationship with connectors and mates rather than relying on raw `translate()` offsets alone. Raw offsets are acceptable for free placement, but touching load-path geometry needs named interfaces the validator and Studio can inspect.
- Prefer `assembly().model()` for multi-part scenes so Studio receives per-part identity, material, mate, and transform metadata. Collapse with `.toCompound()` or `.toUnion()` only when a downstream export truly requires one body.
- For interactive joints, keep heavy CAD recompute as the committed source-of-truth path, but use viewport-side joint posing for drag feedback whenever transform metadata is available. Drag should move the existing part mesh immediately; release commits the parameter for exact recompute, review, and export.
- Final reports for mechanism/gallery work should include an artifact packet: source path, generated artifact paths, deterministic checks run, visual proof path, and unresolved caveats.

## Source and artifact policy

- Source of truth: `.kcad.ts`, task brief/prompt markdown, tests, and explicit provenance metadata that records where dimensions, vendor parts, prompts, and review decisions came from.
- Derived artifacts: rendered PNGs, MP4 demos, STEP, STL, 3MF, DXF, score JSON, generated topology dumps, generated capture-run metadata, and generated route/build outputs.
- Commit derived artifacts only when the repository already treats that directory as an artifact bundle (`docs/demos/**`, `examples/portfolio/**`) or the user explicitly requested a deliverable bundle.
- When committing derived artifacts, keep the source file and provenance beside them and prefer existing capture scripts so hashes/metadata stay reproducible.
- If an artifact changes but source/provenance did not, stop and explain why. Hidden artifact churn is not a valid CAD change.
- Required visual packet: for review-worthy visual work, keep an inspection bundle beside the generated artifact by running `kernelcad render inspect <file> <outDir>`. The v1 bundle writes `manifest.json` and canonical RGB views, with optional `--channels rgb,mask,depth,normals` and `--focus <names>` / `--hide <names>` object filters recorded in the manifest. Depth, normals, and mask channels extend the same packet as richer evidence; they do not replace the canonical RGB views.

## Standard parts and vendor geometry

Use `lib.fromSTEP(...)` for off-the-shelf components whenever physical fit matters:

- Good candidates: motors, servos, bearings, shafts, fasteners, hinges, sensors, PCBs, connectors, rails, and purchased enclosures.
- Store or reference the vendor STEP file deliberately; name the source, version, and license/terms in nearby metadata or README when the file is part of a demo/portfolio bundle.
- Before placing a vendor STEP, run `kernelcad inspect step <file.step>` (or the `inspect({ of: 'step' })` MCP tool) to read the solid tree, per-solid exact bbox + volume, and detected cylindrical holes (axis, diameter, depth, blind/through) — find mounting-hole positions and verify the part-local frame from exact geometry instead of measuring renders.
- Build modeled brackets, mounts, clearances, cable paths, and keepouts around the imported part rather than approximating the part with generic boxes/cylinders.
- Placeholder geometry is acceptable for early blockouts, but final review must label it as a placeholder or replace it with catalog geometry.
- Format choice when the vendor offers several: STEP (`lib.fromSTEP`) is the default and the most portable. OCCT `.brep` (`lib.fromBREP`) is lossless and the fastest to load, but only kernelCAD/OCCT writes it — it is for round-tripping our own geometry, not vendor interchange. Reach for `.stl` (`lib.fromSTL`) only when nothing better exists: it is a triangle mesh, so you keep bbox/volume/booleans but lose analytic surfaces, which means no reliable fillet/chamfer on curved edges, no canonical face refs, and no hole detection. If a part is STL-only and you need mounting-hole geometry, model the interface yourself rather than trusting facet normals.

> For off-the-shelf fasteners, bearings, motors, headers, and connectors, prefer the bundled parts catalog: load the `kernelcad-parts` skill. The catalog exposes `lib.findPart`, `lib.fetchPart`, and a typed `lib.standard.*` namespace, plus four MCP tools for discovery. Bundled parts ship with pre-defined connector frames so they participate in mates without any `partRef.connector(...)` boilerplate.

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

### Before you say "kernelCAD can't make that"

NEVER tell a user a shape is impossible, or that it needs other software, without first calling `lookup_api` and `lookup_cookbook`. kernelCAD does NURBS freeform surfacing — lofts, sweeps, boundary-fill patches, G2 Hermite blends, and variable-section sweeps — so organic forms (body shells, panels, fairings, ergonomic curves, bottles, horns) ARE in scope. Its two real limits, state them precisely and do not overgeneralize past them:
- It is a **solid/NURBS** kernel, not a **polygon/subdivision sculptor** (Blender/Maya).
- Its viewer renders clean CAD, not **photoreal** images — for a photoreal hero shot, export STEP/GLB and finish in a render tool.

For an organic solid body, reach for the `loft-body-shell-from-profiles` cookbook recipe (`lookup_cookbook("loft a body shell")`).

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

// OCCT native BREP — lossless (exact analytic surfaces + full topology, no
// schema translation, no tessellation). Every downstream op is valid on the
// result. OCCT-specific: use STEP to interchange with other CAD systems.
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

// Override the camera look-at target for `setRenderPose` and headless
// engineering renders. Default is the bbox centroid; that auto-fit skews
// when a build has tall asymmetric features (pocket-watch with pendant +
// bail above origin, scope with offset eyepiece, lamp with tall shaft).
// Pass an explicit (x, y, z) in the script's world frame to re-aim the
// camera; the renderer translates it into its recentered scene frame
// automatically. Virtual record — no OCCT geometry produced. Multiple
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
// Virtual record — no OCCT geometry. Every animated param MUST be declared
// NUMERIC by a prior param() call; undeclared/non-numeric params, two tracks
// on the same param, and malformed keys (empty tracks/keys, non-finite or
// negative atMs, duplicate atMs, unknown ease) THROW KernelError
// (`animation.param.unknown` / `animation.track.duplicate-param` /
// `animation.keys.invalid`). Out-of-range key values clamp to the param
// boundary with an `animation.value.clamped` warn. Multiple animationView()
// calls register multiple records; capture uses the LAST one and the later
// record carries an `animation.view.shadowed` warn naming the shadowed ids.

// Declare printability (design-for-manufacture) gates for the model.
// Declaration-only: registers a virtual record (no OCCT geometry);
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
filter inside OCCT first, then rank or bucket the resolved list in TypeScript.

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
  never re-derives one — so `EdgeSegment.id` and the `@kc[...]` ref plus OCCT
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
//   const servo = await lib.fetchPart('servo/sg90');
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

// Sweep this profile along a 3D rail.
// spine: 'polyline' (default) keeps real corners — pipe runs, L-bends;
//   transitionMode ('right' | 'transformed' | 'round') picks how those corners are bridged.
// spine: 'smooth' builds ONE B-spline spine through the rail points and places the
//   profile at the rail start — REQUIRED for rails that sample a smooth curve
//   (helix(...), threads, organic paths). A polyline spine on a dense smooth rail
//   produces per-segment tubes that do not sew and fail the watertight export verify.
// frenet: true rotates the profile with the rail curvature.
.sweep(rail: [number, number, number][], opts?: { frenet?: boolean; transitionMode?: 'right' | 'transformed' | 'round'; spine?: 'polyline' | 'smooth' }): Shape

// Loft through one or more additional sections to produce a 3D solid.
// Use for nozzles (round-to-square), wings, fairings, transition pieces.
// opts.spacing z-stacks sections axially; opts.planes overrides with explicit per-section placement.
.loft(other: Sketch | Sketch[], opts?: {
  spacing?: number;
  planes?: { plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number] }[];
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
.tangentCircle(entities: TangentEntity2D[], opts?: { radius?: Editable<number>; near?: [Editable<number>, Editable<number>] }): Sketch  // Circle TANGENT to other geometry. 2 entities + opts.radius = sketch-fillet; 3 entities, no radius = through-three. Terminal, like circle().
.tangentLine(a: TangentEntity2D, b: TangentEntity2D, opts?: { near?: [Editable<number>, Editable<number>] }): PathBuilder  // Segment along the line tangent to two circles — the belt/pulley move. Both entities must be circles.
.label(name: string): PathBuilder               // Tag the prior segment for fillet/chamfer/shell by name.
.close(): Sketch                                // Close path; returns a Sketch.
```

`tangentCircle` / `tangentLine` take entities of the form `{ kind: 'line', from: [x,y], to: [x,y] }` (an INFINITE line; `from`->`to` sets direction) or `{ kind: 'circle', center: [x,y], radius }`, each with an optional `side: 'outside'` (default) `| 'enclosed' | 'enclosing' | 'unqualified'`. Points are not supported — the bundled OCCT does not bind `Handle_Geom2d_Point`. These constructions have SEVERAL solutions (a radius-r circle tangent to two perpendicular lines has four, one per quadrant). `side` filters first, `opts.near: [x,y]` then picks the closest solution, and if more than one still survives the build FAILS with `sketch.tangency.ambiguous` listing every candidate rather than guessing. No such construction existing fails with `sketch.tangency.no-solution` naming the geometric reason.

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

- `inspect({ of: 'constraints', constraints? })` — discover the supported types and echo the current constraint list.
- `add_constraint({ constraints?, constraint })` — validate one constraint and return a new list; no session state is mutated.
- `solve_sketch({ entities, constraints })` — solve a 2D constraint set and return `{ ok, entities, constraints }` or validation errors; no script is modified.

Entity and selection recovery:

- If a constraint references a missing id, list the entity ids you are passing and fix the `entities` array before solving.
- If a `LINE` references non-POINT endpoints or a `CIRCLE` references a non-POINT center, replace the referenced id with a `POINT`.
- If a constraint reports the wrong entity count, check the type arity: most types use 2 entities; `RADIUS` uses 1, `ANGLE` uses 1 or 2, and `SYMMETRIC` uses 3.
- If `DISTANCE`, `RADIUS`, or `ANGLE` reports a missing value, add a numeric `value`.
- If the type is unsupported, call `inspect({ of: 'constraints' })` or `lookup_api({})` and choose one of the supported types above.

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

## When something fails

Every kernel-running tool returns `diagnostics[]`. Each entry has `code`,
`message`, `severity`, optional `feature_id`, and a `hint` — a one-sentence,
imperative recovery instruction. Read the `hint` first; if your feature
failed because an upstream feature failed (`code` is
`recompute.input.missing`), call `why_did_this_fail` to walk the chain
and find the root cause.

The full code catalogue is enumerated by the
`lookup_diagnostics` MCP tool. Call it once at session start if you
want to pre-populate retry strategies.

## CLI Commands

```bash
# Run a script and report features + diagnostics
kernelcad evaluate path/to/script.kcad.ts

# Same, but JSON output (machine-readable)
kernelcad evaluate path/to/script.kcad.ts --json

# Export to a file in the chosen format
kernelcad export stl  path/to/script.kcad.ts -o /tmp/out.stl
kernelcad export step path/to/script.kcad.ts -o /tmp/out.step
kernelcad export dxf  path/to/script.kcad.ts -o /tmp/out.dxf   # planar profile; laser / waterjet
kernelcad export 3mf  path/to/script.kcad.ts -o /tmp/out.3mf   # slicer mesh with per-part colors
kernelcad export glb  path/to/script.kcad.ts -o /tmp/out.glb   # web / AR viewer; PBR materials
kernelcad export stl  path/to/script.kcad.ts --part lever -o /tmp/lever.stl  # one solved-assembly part (world-frame); repeat --part with -o <dir> for a subset
kernelcad export stl  path/to/script.kcad.ts --parts all -o /tmp/parts/      # every assembly part as <dir>/<part>.stl
kernelcad export stl  path/to/script.kcad.ts -o /tmp/out.stl --no-verify     # skip the default-on watertight verify gate
kernelcad parts path/to/script.kcad.ts --json                  # list assembly parts with bbox, volume, surface area, triangle count

# Render a 4-view PNG (front/right/top/iso) for visual review.
# Tiles are framed to the requested --width/--height: the camera fits the
# visible geometry to the output aspect and the capture is center-cropped,
# so the default 1024×1024 square tiles frame correctly.
kernelcad render path/to/script.kcad.ts -o /tmp/out.png

# Clip the model with a section plane to expose interiors in headless captures.
# Keeps the negative-axis side by default; --section-flip keeps the positive side.
kernelcad render path/to/script.kcad.ts -o /tmp/cut.png --section z=10

# Interrogate an external STEP file before placement: solid tree, per-solid
# exact bbox + volume, cylindrical holes (axis, diameter, depth, blind/through)
kernelcad inspect step path/to/part.step

# Detect BREP interferences between Scene parts (industry-standard clash check)
kernelcad interference path/to/script.kcad.ts

# Validate the assembly: floating parts, orphan clusters, interferences (v0.5 MVP)
kernelcad validate path/to/script.kcad.ts

# Run the print-readiness gates declared by the script's dfmSpec()
# (exit 0 pass / 1 gate failed / 2 no dfmSpec declared; --json for the full report)
kernelcad dfm path/to/script.kcad.ts

# Capture the script's animationView({...}) timeline to MP4 (ffmpeg), verifying
# the sampled poses for part interference (exit 0 clean / 1 collisions / 2 could
# not capture). Requires a running studio dev server (npm run dev).
kernelcad animate path/to/script.kcad.ts -o /tmp/out.mp4
kernelcad animate path/to/script.kcad.ts --frames /tmp/frames   # PNG sequence; no ffmpeg
kernelcad animate path/to/script.kcad.ts --no-verify            # skip the pose-interference gate
kernelcad animate path/to/script.kcad.ts --hide wall,cap        # hide parts in the frames (cutaway); --focus shows only the named parts (mutually exclusive; verification still runs on the full model)

# Run the MCP server (stdio transport)
kernelcad mcp
```

## Animation timelines (animationView)

`animationView({...})` declares a kinematic-motion timeline that
`kernelcad animate` (or the `capture_animation` MCP tool) renders to an MP4 or
a PNG frame sequence. It is a virtual record — no OCCT geometry is produced —
and the captured artifact is evidence of the motion, not a design source.

Use the keyframe-track form for a mechanism cycle: each track animates one
NUMERIC `param()` through `{ atMs, value, ease? }` keys on one shared timeline.

```typescript
const drumDeg  = param('drumDeg', 0, { min: 0, max: 360 });
const swingDeg = param('swingDeg', 0, { min: 0, max: 40 });
// ... build the assembly so drumDeg / swingDeg drive its mates ...

animationView({
  name: 'dispense cycle',
  tracks: [
    // Drum eases in to 60 deg, dwells (hold) to 1400 ms, then eases back to 0.
    { param: 'drumDeg', keys: [
      { atMs: 0,    value: 0 },
      { atMs: 800,  value: 60, ease: 'easeInOut' },
      { atMs: 1400, value: 60 },                    // dwell: value repeated → no motion
      { atMs: 2200, value: 0,  ease: 'easeInOut' },
    ] },
    // Meter swings out while the drum dwells, then snaps closed (step).
    { param: 'swingDeg', keys: [
      { atMs: 800,  value: 0 },
      { atMs: 1400, value: 35, ease: 'easeOut' },
      { atMs: 1600, value: 0,  ease: 'step' },      // step: holds, then jumps at arrival
    ] },
  ],
  fps: 30,
});
```

**Ease semantics.** `ease` applies to the segment ENDING at the key ("arrive
with this easing", default `linear`); the value holds (clamp) before the first
key and after the last. `step` holds the previous value until it jumps exactly
at the key. A dwell is two consecutive keys with the same value.

**Validation (throws at capture time).** Every track param must be a NUMERIC
`param()` declared earlier (`animation.param.unknown`); a param may appear in at
most one track (`animation.track.duplicate-param`); empty tracks/keys, non-finite
or negative `atMs`, **duplicate `atMs` within a track**, and unknown `ease`
throw `animation.keys.invalid`. Key values outside the param's declared min/max
clamp to the boundary with an `animation.value.clamped` warn. Multiple
`animationView()` calls keep the LAST record and warn `animation.view.shadowed`.

**Capture (`kernelcad animate <file> [out.mp4]`).** MP4 via ffmpeg by default;
`--frames <dir>` writes a PNG sequence and skips ffmpeg entirely (use when
ffmpeg is unavailable). `--fps <n>` overrides the record's fps. `--focus <names>` /
`--hide <names>` isolate parts in the rendered frames (comma-separated feature ids
or assembly part names, mutually exclusive — same semantics as `kernelcad render`;
use for cutaways like an internal drum behind a frosted wall). Visibility is
render-only and does NOT affect the pose-interference verification, which always
runs against the full model. Exit codes:
`0` = captured + verification clean (or skipped), `1` = captured but the pose
gate found collisions (the MP4/frames ARE still written as evidence), `2` =
could not capture at all (bad args, build error, no `animationView` record, an
unsolvable pose, ffmpeg missing, browser bootstrap failure). Like
`kernelcad render`, capture drives a headless browser against a **running
studio dev server** (`npm run dev`; honors `VITE_PORT` / `PW_CDP_URL`).

**Motion verification.** By default, before paying any browser/ffmpeg cost,
capture verifies the sampled poses for part interference at every keyframe time
plus each segment midpoint (`--verify-every <n>` additionally samples every
n-th frame time of the fps schedule). `verified: true` means verification ran
AND every sampled pose was collision-free using the mechanism-validity 20 mm³
threshold (touching ≠ interference; declared `solvedModel({ ignore })` pairs are
honored). Each collision is a `{ tMs, a, b, volumeMm3 }` row with an
`animation.collision` diagnostic naming the pair and time. `--no-verify` skips
the gate and sets `verified: false` (`verify_skipped` on the MCP envelope) — do
not ship a mechanism animation with `--no-verify` standing in for a clean pass.

**Studio Animation tab (live review).** The same `animationView` timeline plays
live in Studio's Inspector Animation tab — scrub or play it (with loop /
reciprocate modes and a speed control). The timeline is baked once (every frame
solved server-side into per-part transforms), then interpolated and played
client-side at full rate, so playback is smooth; on pause the kernel pose is
synced to the displayed frame so Export/Validate agree with the viewport. Live
drive needs a server-pool session (the model opened via `?script=`); the
editor-only mode previews sampled values. Offline `kernelcad animate` remains
the full-fidelity, verified MP4 capture.

<!-- OUT-OF-SCOPE:START -->
## Out of Scope

These are not available today; do not generate code that uses them. Anything not listed here is fair game — call `lookup_api` / `lookup_cookbook` before concluding kernelCAD lacks a capability.

- Asymmetric chamfer (only symmetric 45° supported) — deferred
- BOM extraction — deferred
- Feature-level dimensioning on `svg-drawing` (hole callouts, param-bound dims, section views) — deferred; overall bounding-box dimensions and the title block do ship
- Multi-view PDF sheets — deferred; `export({ format: 'svg-drawing' })` ships an SVG sheet instead
- NURBS surface extend/untrim/blend, surface-surface intersection, lattice/quilt — deferred
- Tracked face/edge refs (only canonical refs and inline queries work) — deferred

<!-- OUT-OF-SCOPE:END -->

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
| loft-body-shell-from-profiles | You need a recognizable, printable stylized solid body (car body, boat hull, fuselage, casing) that primitives can't express. Define cross-section profiles at stations along an axis, loft a solid through them, then shell + fillet. This is NURBS surfacing for organic bodies — not a polygon sculpt and not a photoreal render. |
| mirror-half-part | The part is symmetric across a cardinal plane; build only one half and call mirror to produce the complete symmetric part. |
| non-overlapping-l-bracket | You're building two perpendicular plates joined at a right angle; both plates have the same thickness; volumes must not overlap at the joint. |
| parametric-bolt-pattern-skeleton | You want a compact bolt-hole part with an editable bolt-diameter parameter that can be changed later. |
| path-hermite-g2-blend-2d | You're authoring a freeform 2D outline that should transition from one prescribed point + tangent (+ curvature) to another with G2 continuity (no visible curvature crease where adjacent neighbours meet). Drop a single .hermiteG2(a, b) call into the chain; a.point must match the current pen position. Tangent magnitude is the first derivative (typical ~ chord length, NOT unit length). |
| path-nurbs-segment-explicit | You have an explicit B-spline control polygon (programmatic generation, round-tripping from external CAD, when precise shape control beats waypoint convenience) and want a 2D path segment authored from the control net directly. The first control point must match the current pen position within 1e-6 mm; the pen ends at the last control point. |
| path-spline-organic-outline | You need a freeform 2D outline (eyewear brow, ergonomic grip silhouette, sneaker midsole) authored as a sequence of measured waypoints, and arc primitives + smoothSpline are too rigid. Drop a single .spline([...]) call into the path() chain after moveTo; the path interpolates through every waypoint at degree 3. |
| revolve-rectangular-profile | You want a thin cylindrical wall, ring, or tube — author the rectangular profile via path() with the inner radius as the x offset, then call .revolve() to sweep it around Z. |
| subtract-then-fillet-rim | You want a parametric plate, drill a through-hole, and round the rim where the hole meets the top face. |
| tab-slot-flush-joint | You are joining flat stock (laser/CNC plywood, acrylic, sheet) with an interlocking tab-and-slot. The through-tab must span the full mating wall thickness — flush or slightly proud, never recessed — and the fit clearance belongs on the slot, not on the tab. |
| union-of-stacked-primitives | You want to compose multiple primitives into one part by translating each into place and unioning them, without volume overlap. |

<!-- COOKBOOK:END -->

## Conventions

- Always declare params at the top of the script with units; the kernel evaluates them and surfaces them as live sliders to the studio.
- Never use JS arithmetic on a `param()` result — `param('w', 18) + 4` coerces the branded ParamRef and throws `feature.invalid-args`. Build derived dimensions with the ParamRef methods: `.add(n)`, `.subtract(n)`, `.multiply(n)`, `.divide(n)`, `.negate()` — e.g. `w.add(4)`, `r.divide(2)`. These return derived ParamRefs that re-evaluate whenever the underlying param changes.
- Prefer `target.hole(face, opts)` for cylindrical bores (single hole), `target.holes(face, opts)` for bolt patterns, and `target.cutout(profile, opts)` for irregular subtractive shapes (slots, D-pockets) over `subtract(cylinder)` — they emit named created refs (`'wall'`, `'floor'`, `'wall-back'`, `'counterbore-wall'`, `'counterbore-floor'`, `'countersink-cone'`) that downstream `.fillet()` / `.shell()` can address.
- Apply transforms AFTER edge/face features when the face filter matters; transforms commute with everything except face-ref resolution.
- Always `return` a single shape from the top of the script — the kernelCAD CLI exports whatever you return. Only the returned shape is honored by export / probe / measurement surfaces; "the last thing I created" is NOT a fallback you can rely on — mutating transforms (`.translate()`, `.rotate()`) re-use their record, and any helper shape created after the main body silently becomes the newest record. If a probe reports the same bbox no matter what you edit, you are measuring a stale or decoy record: check what the script returns.
- For symmetric parts, prefer `.mirror(plane)` (union of source + reflection) over manual duplication. Use `.reflect(plane)` when you only want the reflected geometry without the original.
- In booleans, prefer ≥0.1 mm of overlap (unions) or offset (subtractions/clearances) over exact tangency or coincidence between solids — exact-tangent junctions stress the export mesher; the export pipeline heals the resulting cracks, but offsets keep meshes clean at the source.
- For helical features (coils, springs, threads), generate the rail with `helix(...)` and sweep a closed `path()` profile with `spine: 'smooth'` — the dense helix rail needs a single B-spline spine to produce a sewn, watertight tube; the default polyline spine emits per-segment tubes that fail the watertight export verify. `frenet` is unnecessary with a smooth spine.

## Interlocking joinery (flat-pack / laser / CNC)

Tab-and-slot and finger joints in flat stock follow a fixed discipline; getting it backwards produces joints that read as empty slots and carry no load.

- **Through-tabs sit flush or slightly proud — never recessed.** Model the tab to span the FULL thickness of the mating wall; add 0.2–0.5 mm of proud allowance when the face will be sanded or flush-trimmed after assembly. A tab whose end face stops short of the mating surface — even by 0.2 mm — looks like an empty slot and leaves the glue/bearing area undersized.
- **Fit clearance goes on the slot/pocket, not the tab.** Keep the tab at nominal width and thickness; widen the slot by a per-side clearance. Shortening or thinning the tab destroys both the flush face and the joint's reference geometry.
- **Clearance is process-dependent — encode it as a named param (`tabFit`)** so it can be retuned per machine and material without touching geometry:
  - Laser: the beam removes a kerf (~0.1–0.3 mm depending on material and thickness) that already loosens nominal-drawn joints by roughly one kerf width; `tabFit` of 0–0.1 mm per side usually yields a snug press fit.
  - CNC router: `tabFit` 0.1–0.25 mm per side, plus dog-bone / T-bone corner relief at internal slot corners (relief radius ≥ endmill radius) so square tab corners can seat fully.
  - Mating 3D-printed parts: `tabFit` 0.15–0.3 mm per side.
- **Finger joints (box joints):** finger width 1–2× material thickness; finger depth equals the mating wall thickness exactly (plus the same proud allowance) so finger ends finish flush with the outer face; prefer an odd finger count for a symmetric edge.
- Canonical pattern: cookbook snippet `tab-slot-flush-joint` — `lookup_cookbook("tab and slot flush joint")`.

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

### Surfaces → solid (Slice E finishing ops)

Two Coons patches trimmed to a shared edge, sewn into a closed solid, drafted for mold release, then exported as STEP.

```typescript
// Build two complementary 4-boundary patches that share the bottom edge.
const sharedBottom = nurbsCurve([[0, 0, 0], [25, 0, 1], [50, 0, 0]]);
const right   = nurbsCurve([[50, 0, 0], [50, 12, 0.5], [50, 25, 0]]);
const top     = nurbsCurve([[50, 25, 0], [25, 25, 1], [0, 25, 0]]);
const left    = nurbsCurve([[0, 25, 0], [0, 12, 0.5], [0, 0, 0]]);

const bottom2 = nurbsCurve([[0, 0, 0], [25, 0, -1], [50, 0, 0]]);
const right2  = nurbsCurve([[50, 0, 0], [50, 12, -0.5], [50, 25, 0]]);
const top2    = nurbsCurve([[50, 25, 0], [25, 25, -1], [0, 25, 0]]);
const left2   = nurbsCurve([[0, 25, 0], [0, 12, -0.5], [0, 0, 0]]);

const patchA = surfaceFromBoundary([sharedBottom, right, top, left]);
const patchB = surfaceFromBoundary([bottom2, right2, top2, left2]);

// Trim each patch at their shared boundary curve so the sewn edges align.
const trimmedA = patchA.trimTo(sharedBottom);
const trimmedB = patchB.trimTo(sharedBottom);

// Sew into a closed solid (requireClosed catches authoring mistakes early).
const solid = sew([trimmedA, trimmedB], { requireClosed: true });

// Apply draft to one face for mold release.
const molded = solid.draft(3, { face: 'top' });

return molded;
```

Export as STEP after verifying:

```bash
kernelcad evaluate surfaces-to-solid.kcad.ts   # exits 0, no open-shell diagnostic
kernelcad export step surfaces-to-solid.kcad.ts -o out.step
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

## DFM gates (print readiness)

`dfmSpec({...})` declares printability gates in the script; the check engine
enforces them at evaluate time. Three gates ship: **part-pair clearance**
(exact BREP minimum distance), **minimum wall thickness** (inward ray sampling
over the export-grade mesh), and **void/channel topology** (voxel flood-fill:
undeclared sealed voids + channel mouth counting).

```typescript
dfmSpec({
  minWall: 0.8,                       // thinnest wall the DESIGN intends to print
  minClearance: 0.45,                 // fit gap between distinct parts
  includeArticulatedMates: true,      // moving links must also clear at the rest pose
  ignore: [['lid', 'hinge-pin']],     // design-intent contact: clearance-exempt pair
  exclude: ['servo-*', 'pcb'],        // not printed: skips minWall + voids
  channels: [
    { part: 'base', name: 'cable-duct', openings: 2 },               // through-channel
    { part: 'float', name: 'air-pocket', openings: 0, sealed: true },  // intentional sealed void
  ],
});
```

Semantics that matter when authoring the declaration:

- **Opt-in, then always-on.** Scripts without a `dfmSpec` are untouched. Once a
  record is present, EVERY `evaluate` / `evaluate_script` run enforces the
  gates — there is no flag to skip them. A failing gate exits 1 with
  error-severity `dfm.*` diagnostics.
- **Moving mates are opt-in.** By default, all declared mate pairs are exempt
  from the clearance check so seated/fastened interfaces do not create false
  failures. Set `includeArticulatedMates: true` on a mechanism to measure every
  non-fastened mate pair at its declared rest pose. Fastened mates remain
  exempt because their physical contact is checked by the mechanical
  plausibility gate. This is a rest-pose screen, not a swept-motion proof.
- **Malformed declarations THROW at capture** (`feature.invalid-args`
  KernelError) instead of stashing warnings — dfmSpec is an enforcement gate,
  and a silently-disabled gate is worse than a build failure. At least one of
  `minWall` / `minClearance` / `channels` is required; `sealed: true` requires
  `openings: 0` (and vice versa); `exclude` globs are trailing-`*` prefix only.
- **`exclude` and `ignore` are different exemptions.** `exclude` marks parts as
  NOT PRINTED (vendor STEP imports, electronics): they skip minWall and void
  checks but STILL participate in clearance — a vendor part 0.2 mm from a
  printed part is a real assembly problem. `ignore` is a per-PAIR clearance
  exemption for design-intent contacts. Pairs joined by a declared mate are
  clearance-exempt automatically. Overlapping pairs are tagged `interfering`
  and emit the shared `assembly.interference.overlap` error — overlap analysis
  belongs to the interference gate, but the DFM gate never passes over it.
- **Choose `minWall` from the design's intended wall floor**, not a generic
  printer guideline. Declaring `minWall: 1.5` against a design whose thinnest
  intentional wall is 0.8 mm just fails everything and tells you nothing about
  real defects. Also expect near-tangent authoring slivers (a boss grazing a
  rim, a blend tangent to a bore) to surface as sub-0.1 mm wall findings —
  those are honest measurements of sliver geometry; fix the tangency or read
  past them deliberately.
- **Channel detection limits.** ONE non-sealed channel per part — a second
  declaration emits `feature.invalid-args` and the mouth count binds to the
  first. Channels wider than ~16 mm escape the morphological closing and
  report `found: 0` — that is a detection limit, not a blockage. The declared
  channel binds to the LARGEST detected internal component, which can misbind
  on parts with multiple internal voids; the reported `channelSeed` location
  shows which component was picked (binding the declaration by location is a
  recorded follow-up).
- **`'unknown'` clearance status means the measurement FAILED** (kernel error
  on that pair), not that the pair passed. Unknown pairs and kernel-failed
  parts stay warn severity: they surface in the report and the CLI summary
  (`, N unknown`) but never flip the exit code.
- **Diagnostic locations are world-frame.** Every xyz in a `dfm.*` diagnostic
  message is mapped through the part's world transform, so findings compose
  across the parts of a posed assembly. The raw `walls[]` / `voids[]` report
  structs keep part-local coordinates.

Surfaces: automatic on `kernelcad evaluate` / MCP `evaluate_script`; standalone
report via `kernelcad dfm <file>` (`--json`) and MCP `verify({ check: 'dfm' })`.

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

### Glass, brushed metal, textured surfaces

Three additional `PBRMaterial` fields cover the common photoreal archetypes:

**Glass (volume absorption).** `transmission > 0` is light passing through;
`thickness` (mm) and `attenuationColor` + `attenuationDistance` (mm) together
shade the colored absorption through the body. The renderer auto-loads a
neutral studio HDRI when any material in the scene has `transmission > 0`, so
glass renders with realistic refraction without needing `setRenderEnvironment`.

```typescript
// Dark sunglass lens
lens.material({
  baseColor: '#ffffff',
  transmission: 0.85,
  ior: 1.5,
  thickness: 3,
  attenuationColor: '#1a1a2a',
  attenuationDistance: 8,
  roughness: 0.0,
});
```

**Brushed / anisotropic metal.** `anisotropy` (0..1) stretches the specular
highlight; `anisotropyRotation` (degrees, normalized to [0,360)) aligns the
brush direction with a face axis.

```typescript
// Brushed aluminum hinge
hinge.material({
  baseColor: '#b0b0b0',
  metalness: 1.0,
  roughness: 0.3,
  anisotropy: 0.8,
  anisotropyRotation: 90,
});
```

**Image-texture maps.** `textures` attaches up to six maps — `albedo`,
`normal`, `roughness`, `metalness`, `anisotropy`, `emissive`. Paths resolve
relative to the script file (mirrors `referenceImage()`); `https://` URLs are
fetched once and sha256-cached at `~/.cache/kernelcad/textures/`.

```typescript
// Matte acetate frame with normal-mapped grain
frame.material({
  baseColor: '#1a1a1a',
  roughness: 0.55,
  textures: {
    albedo: { path: './acetate-color.png' },
    normal: { path: './acetate-normal.png' },
    roughness: { path: './acetate-rough.png' },
  },
});
```

Supported texture formats: `.png`, `.jpg`, `.jpeg`, `.webp`. Maximum dimension
8192px (hard error); textures over 2048px on the longest side surface a
console warning. Each `TextureRef` accepts optional `repeat: [u, v]`,
`offset: [u, v]`, and `rotation: <degrees>`.

**For reproducible hero builds:** download URL textures and check the files
into the script's directory before committing. Agent-fetched URLs land in
`~/.cache/kernelcad/textures/` but that cache is not source-controlled.

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
