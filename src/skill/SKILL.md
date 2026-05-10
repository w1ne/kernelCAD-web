---
name: kernelcad
description: kernelCAD model authoring guide for `.kcad.ts` scripts — primitives, transforms, booleans, patterns, edge features (fillet/chamfer/shell), face features, sketches with arbitrary profiles, sketch operations (extrude/revolve/sweep/loft/reflect), path builder, mirror/reflect, editable parameters, exports. Use when writing or modifying kernelCAD geometry from a coding agent context.
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
// the color so identity lives at leaf parts. Tokens: 'servo' | 'gear' | 'beam' |
// 'shaft' | 'plate' | 'pin' | 'frame' | 'tool'. Hex escape hatch: any '#rrggbb'.
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

### Assembly intent

Use `assembly()` when the model needs named mechanical parts, connector frames, and joint metadata that a human or agent can inspect later. Call `.model()` after adding parts to return a `Scene` with per-part bodies; iterate `.parts` for per-part rendering / export, call `.toCompound()` for an OCCT group (lossless on color/name/identity, default for STEP), or `.toUnion()` for one fused solid (lossy on color/name — antipattern except when downstream truly needs a single Shape). Connector and joint records remain metadata for now; `.model()` does not solve motion (use `.solvedModel(poses)` for that). Use MCP `list_assemblies({ file? code? })` to inspect the captured assembly intent without recomputing topology.

```typescript
const arm = assembly('two-link arm');
const base = arm.part('base', box(30, 30, 8), {
  at: [0, 0, 0],
  connectors: { shoulder: { origin: [15, 15, 8], axis: [0, 0, 1] } },
});
const link = arm.part('link', box(80, 12, 8), {
  connectors: { root: { origin: [0, 6, 4], axis: [0, 0, 1] } },
  connect: { connector: 'root', to: base.connector('shoulder') },
});

arm.connect('shoulder-fixed', base.connector('shoulder'), link.connector('root'));

arm.revolute('shoulder', base, link, {
  axis: [0, 0, 1],
  origin: [0, 0, 8],
  limitsDeg: [-90, 90],
});

// Agent-natural: return the Scene directly. The CLI / studio walks .parts,
// the renderer paints per-part role colors, and STEP export uses
// .toCompound() under the hood. Reach for .toUnion() only if a downstream
// tool truly needs a single fused Shape (lossy on color/name/identity).
return arm.model();
```

```typescript
interface Assembly {
  part(name: string, shape: Shape, opts?: {
    at?: [number, number, number];
    connectors?: Record<string, { origin: [number, number, number]; axis?: [number, number, number] }>;
    connect?: { connector: string; to: AssemblyConnectorRef; name?: string };
  }): AssemblyPartRef;
  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef;
  revolute(name: string, a: AssemblyPartRef, b: AssemblyPartRef, opts: {
    axis: [number, number, number];
    origin: [number, number, number];
    limitsDeg?: [number, number];
  }): AssemblyJointRef;
  model(): Scene;
  solvedModel(poses: Poses): Scene;
}
```

### Scene API

`Assembly.model()` and `Assembly.solvedModel(poses)` return a `Scene` — a frozen, ordered list of named parts with per-part world transforms. A Scene is iterable (`for (const p of scene)`), exposes `.parts` for indexed access, and offers two ways to collapse to a single Shape when one is required.

```typescript
interface ScenePart {
  readonly name: string;            // assembly-unique name from assembly.part(name, ...)
  readonly shape: Shape;            // LOCAL-frame (untransformed)
  readonly worldTransform: Transform; // SE(3); identity for kinematic-zero model() apart from each part's `at`
  readonly color?: string;          // role token / hex; resolved from source shape's metadata
  readonly metadata?: Readonly<Record<string, unknown>>;
}

interface Scene extends Iterable<ScenePart> {
  readonly assemblyName: string;
  readonly parts: readonly ScenePart[];
  readonly bbox: { min: [number, number, number]; max: [number, number, number] };  // lazy AABB over transformed parts

  // OCCT TopoDS_Compound — groups bodies without booleaning. Lossless on
  // per-part identity. Default path for STEP export with named bodies, or
  // when a single Shape handle is needed without paying for a fuse.
  toCompound(): Shape;

  // Explicit boolean fuse. Lossy on color, name, metadata — the result is
  // a single Shape with no per-part identity. Documented antipattern;
  // prefer toCompound() unless downstream truly needs one solid.
  toUnion(): Shape;

  // Look up a part by its assembly-unique name. Throws KernelError
  // ('feature.invalid-args', hint 'invalid-args.scene.unknown-part') on miss.
  part(name: string): ScenePart;

  // Deprecated v0.5.0 — call .toUnion() instead. Warn-once advisory; will
  // be removed in v0.6.0. (SolvedKinematics.toShape() carries the same
  // deprecation; use .toScene().toUnion() there.)
  toShape(): Shape;
}
```

**Snapshot vs reactive:** Scene is a frozen snapshot; reactivity lives on the capture-time Assembly. Param edits trigger recompute → fresh Scene emitted to the renderer. Never mutate a Scene; re-build from the Assembly to get a new one.

```typescript
const scene = arm.model();
for (const part of scene) {
  console.log(part.name, part.color, part.worldTransform);
}
const base = scene.part('base');             // throws KernelError on miss
const compound = scene.toCompound();         // STEP-friendly group, per-part identity preserved
const fused = scene.toUnion();               // antipattern; only when one solid is required
```

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
.label(name: string): PathBuilder               // Tag the prior segment for fillet/chamfer/shell by name.
.close(): Sketch                                // Close path; returns a Sketch.
```

Every PathBuilder coord and scalar accepts `Editable<number>` (`number | ParamRef<number>`), so symbolic params survive into capture and the dispatcher's pre-resolve substitutes them at lower time. Build derived dimensions with the ParamRef arithmetic methods (`.add`, `.subtract`, `.multiply`, `.divide`, `.negate`).

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

## Hole and cutout vocabulary

Three subtractive features ship with hard-coded **created face refs** so chained `.fillet()` / `.shell()` / further `.hole()` / `.cutout()` calls can address the new geometry by name without queries.

```typescript
// Single counterbored bolt hole through a plate
plate.hole('top', {
  u: 10, v: 10,
  diameter: 6, depth: 'through',
  counterbore: { diameter: 11, depth: 4 },
});

// Bolt pattern — 4 holes, one feature record, one editable unit
plate.holes('top', {
  positions: [{u: -20, v: -20}, {u: 20, v: -20}, {u: -20, v: 20}, {u: 20, v: 20}],
  diameter: 5, depth: 'through',
});

// D-shaped slot via cutout (irregular shape hole() can't express)
plate.cutout(
  path().moveTo(-5, 0).lineTo(5, 0).threePointsArc(-5, 0, 0, 10).close(),
  { face: 'top', depth: 6 },
);
```

Created refs emitted per feature kind (resolvable via `{ face: '<name>' }`):

| Ref | Emitted when |
|---|---|
| `wall` | always (cylindrical bore wall, or cutout side walls) |
| `floor` | blind only (no `'through'`, no `upToFace`) |
| `wall-back` | through (`'through'` set OR `upToFace` set) |
| `counterbore-wall` | hole/holes with `counterbore: {...}` |
| `counterbore-floor` | hole/holes with `counterbore: {...}` |
| `countersink-cone` | hole/holes with `countersink: {...}` |

Resolution rule when names collide with canonical face names: created refs always win on the result Shape. After `box.hole('top', ...)`, both `'wall'` (the new bore) and `'top'` (the remaining annular planar region of the original top face) resolve. The canonical name survives because the original face wasn't fully consumed.

`holes(...)`'s bare `'wall'` selector is collective sugar — `.fillet(0.2, { face: 'wall' })` rounds every bore lip in one call.

## Editable parameters

Use `param()` for values the user may want to tweak after the first build; use literals for incidental dimensions. A param returns a symbolic `ParamRef`, not a number, so do not do JS arithmetic with it (`paramRef / 2` will NaN-coerce the branded object). For derived dimensions, chain the arithmetic methods on the ParamRef itself: `.add`, `.subtract`, `.multiply`, `.divide`, `.negate` each return a new ParamRef built on a structured expression that re-evaluates whenever the underlying param changes — e.g. `param('r', 5).divide(2)` for a half-radius, or `param('w', 80).subtract(param('margin', 5).multiply(2))` for a derived inset width.

```typescript
const boltDia = param('boltDia', 5, { min: 3, max: 10, description: 'bolt hole diameter' });
const addCablePort = param('addCablePort', true, { description: 'include cable pass-through' });

return box(80, 50, 6)
  .holes('top', {
    positions: [{ u: -30, v: -20 }, { u: 30, v: -20 }],
    diameter: boltDia,
    depth: 'through',
    name: 'mountBolts',
  })
  .cutout(
    path().moveTo(-8, -5).lineTo(8, -5).lineTo(8, 5).lineTo(-8, 5).close(),
    { face: 'top', depth: 'through', name: 'cablePort', enabled: addCablePort },
  );
```

The batched declaration form is useful for compact top-of-file param blocks:

```typescript
const p = params({ plateW: 80, plateD: 50, plateT: 6 });
return box(p.plateW, p.plateD, p.plateT);
```

For post-build edits, use MCP `params_list({})` to inspect the active evaluated session, then `params_update({ edits: [{ name: 'boltDia', value: 6 }] })`. Updates validate atomically, re-lower only affected records plus their downstream dependents, and return soft warnings when a boolean-gated feature makes a named downstream reference become a passthrough.

### Parametric assembly frames

Every Vec3 surface in the assembly API accepts `Editable<number>` per coord, so connector frames and joint frames can be built from `param()` values. Beyond plain tuples, the `worldOrigin` of a connector is itself a symbolic Vec3 that can be passed back into another assembly input — when downstream consumers read it (e.g. a joint origin = `parent.connector('tip').worldOrigin`), edits to the underlying params propagate live through the chain.

```typescript
const baseX = param('baseX', 70);
const plate = box(baseX, 46, 4);
const arm = assembly('arm');
const base = arm.part('base', plate, {
  connectors: { pivot: { origin: [baseX.divide(2), 23, 4], axis: [0, 0, 1] } },
});
const shoulder = arm.part('shoulder', shoulderLink, {
  connectors: { root: { origin: [0, 9, 2], axis: [0, 1, 0] } },
  connect: { connector: 'root', to: base.connector('pivot'), name: 'base-to-shoulder' },
});
arm.revolute('yaw', base, shoulder, {
  origin: base.connector('pivot').worldOrigin,
  axis: [0, 0, 1],
});
```

`setParamValue('baseX', 100)` reactively rebuilds the plate AND the connector frame AND the joint origin AND the dependent shoulder placement — all in one re-lower. Axis vectors normalize at lower time; an axis whose components resolve to `[0, 0, 0]` raises `feature.invalid-args` with hint `invalid-args.axis.zero`.

### Posing a kinematic chain

`assembly.solve(poses)` returns a `SolvedKinematics` handle that lets you
both render the posed assembly and query per-part world transforms.
`assembly.solvedModel(poses)` returns a posed `Scene` directly — iterate
`.parts`, call `.toCompound()` for STEP, or `.toUnion()` only if a single
fused Shape is required (lossy antipattern). Pose values accept
`Editable<number>` per joint kind:

| Joint primitive | Pose value type |
|---|---|
| `arm.fixed(name, parent, child, { origin? })` | (none — accepts no pose) |
| `arm.revolute(name, parent, child, { axis, origin, limitsDeg? })` | `number` — degrees |
| `arm.prismatic(name, parent, child, { axis, origin, limitsMm? })` | `number` — mm |
| `arm.ball(name, parent, child, { origin, limitsDeg? })` | `[xDeg, yDeg, zDeg]` — XYZ Euler |

Joint origins are in the **parent part's local frame** (URDF/MuJoCo
convention). Multi-joint chains compose correctly; the FK tree-walk
handles N joints.

```ts
arm.revolute('base-yaw',       base,     shoulder, { axis: [0, 0, 1], origin: [45, 35, 8],  limitsDeg: [-120, 120] });
arm.revolute('shoulder-pitch', shoulder, elbow,    { axis: [0, 1, 0], origin: [0, 0, 90],   limitsDeg: [-45, 135] });
arm.revolute('elbow-pitch',    elbow,    wrist,    { axis: [0, 1, 0], origin: [110, 0, 0],  limitsDeg: [-120, 120] });
arm.fixed   ('wrist-tool',     wrist,    tool,     { origin: [75, 0, 0] });
```

**Snapshot vs reactive:** `arm.solve(poses)` resolves pose ParamRefs at call time and returns a frozen `SolvedKinematics` handle (call `.toScene()` for the snapshot Scene). `arm.solvedModel(poses)` is captured as a feature and returns a `Scene`; param updates trigger reactive re-pose → a fresh frozen Scene is emitted to the renderer. Both Scenes are frozen; reactivity always lives on the capture-time Assembly. Use `solve` to read transforms once; use `solvedModel` for editable studio renders.

```ts
const baseYaw       = param('baseYawDeg',       20,  { min: -180, max: 180 });
const shoulderPitch = param('shoulderPitchDeg', 35,  { min:  -45, max: 135 });
const elbowPitch    = param('elbowPitchDeg',   -55,  { min: -120, max: 120 });

return arm.solvedModel({
  'base-yaw':       baseYaw,
  'shoulder-pitch': shoulderPitch,
  'elbow-pitch':    elbowPitch,
});
```

For queryable access:

```ts
const solved = arm.solve({ 'base-yaw': 30 });
const wristT = solved.transform('wrist');         // SE(3) Transform of wrist in world
shape.transform(wristT);                          // attach a new shape to the wrist's frame
const angle = solved.value('base-yaw');           // 30
for (const { name, transform } of solved.bodies()) { /* ... */ }
const snapScene = solved.toScene();               // snapshot Scene; .toShape() is a deprecated alias for .toScene().toUnion()
```

**Limitations (v1):**
- **Numeric joint origins.** Joint origins are plain `Vec3`, not
  `EditableVec3`. Editing geometry params (e.g. `baseX`) reshapes parts
  but not joint frames; future slice will lift joint origins to
  `EditableVec3` once `setParamValue` reactivity is wired through.
- **One frame per part.** Joint origins are `Vec3` numeric, can't bind
  to faces/edges/vertices yet.
- **Body-tree only.** Each part has at most one parent joint; no
  closed-chain (4-bar linkage) kinematics.
- **No motion-limit enforcement.** `limitsDeg`/`limitsMm` accepted but
  out-of-range poses don't warn or throw.
- Calling `solve()` twice on the same Assembly compounds transforms;
  build a fresh `assembly()` per pose query.

### Naming features (slice 2)

When two `.hole()` (or `.cutout()`) calls land on the same target, the bare `'wall'` selector resolves to *all* their walls collectively. To address them individually, give each one a `name:` and use `<name>.<ref>`:

```typescript
plate
  .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through', name: 'mountFront' })
  .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through', name: 'mountBack'  })
  .fillet(0.4, { face: 'mountFront.wall' })   // only the front bore lip
  .fillet(0.8, { face: 'mountBack.wall'  });  // only the back bore lip (deeper fillet)
```

Names are the durable interface. Use them when the chain order may change or when the disambiguation matters semantically.

For lazy chains where naming each feature is overhead, the **ordinal fallback** form `<kind><N>.<ref>` works without any opt change:

```typescript
plate
  .hole('top', { u: -20, v: 0, diameter: 5, depth: 'through' })   // hole1
  .hole('top', { u:  20, v: 0, diameter: 5, depth: 'through' })   // hole2
  .fillet(0.4, { face: 'hole1.wall' })
  .fillet(0.8, { face: 'hole2.wall' });
```

Ordinals count chain-call order among **unnamed** same-kind features only — named features never consume an ordinal slot. If you insert a new unnamed `.hole()` between two existing unnamed ones, the ordinals shift; for stable references, use `name:`.

The resolver tries lineage matching first (canonical → label → named → ordinal), then falls back to a geometric snapshot match (centroid + normal + area) when topology lookup returns zero hits and a fallback snapshot is available. The snapshot path is implicit — agents don't see it as a separate selector form; it just makes named/ordinal references survive ops that would otherwise lose the topology link. Multi-match snapshot results emit `feature.face-ref.ambiguous-after-split`.

Selector parse rules:
- `<ref>`              — collective; matches all faces with that label.
- `<name>.<ref>`       — feature name match; resolves to that feature's faces only.
- `<name>[i].<ref>`    — indexed access into a batched named feature (forward-compatible; slice-2 minimal collapses to `<name>.<ref>`).
- `<kind><N>.<ref>`    — ordinal among unnamed same-kind features.

Names must match `/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/` and must be unique within a chain. Both rules emit `feature.invalid-args` at script time with hints calling out the violation.

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

### Helix sweep

```typescript
// Swept circular profile along a helix — basic coil.
const coilRadius = 15;
const wireRadius = 1.5;
const turns = 4;

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

When you have `kernelcad mcp` available, use the MCP tools for dynamic introspection rather than re-running the CLI. The MCP server exposes 22 tools:

- `evaluate_script({ file? code? })` — pass/fail + featureCount + diagnostics
- `list_features({ file? code? })` — array of feature summaries (kind/id/params/inputs)
- `list_assemblies({ file? code? })` — captured assembly intent: assemblies, parts, named connectors, fixed connections, joints, and aggregate models
- `get_shape_info({ file? code?, feature_id? })` — volume/surfaceArea/bbox of a feature (default: last)
- `list_topology({ file? code?, feature_id? })` — canonical face names + edge count
- `get_edges_of({ file? code?, feature_id?, face_name })` — boundary edges of a face (centroid, length, isClosed)
- `why_did_this_fail({ file? code?, feature_id? })` — walk the upstream chain of a failing feature; returns each upstream feature's id/kind/health/diagnostics in topological order (per-code hints already inline on every diagnostic).
- `set_param_value({ code, param_name, new_value })` — edit a `param()` default value and return modified code plus diagnostics
- `add_feature({ code, feature_code })` — insert one source line before the last top-level return and return modified code plus diagnostics
- `remove_feature({ code, match })` — remove one uniquely matched non-return line and return modified code plus diagnostics
- `list_edges({ file? code?, feature_id? })` — enumerate all edges (index, centroid, length, isClosed)
- `list_faces({ file? code?, feature_id? })` — enumerate all faces with area and centroid
- `list_face_labels({ file? code?, feature_id? })` — canonical face names resolvable on a feature
- `list_api({})` — full curated API surface (globals, Shape methods, Sketch methods, constrained-sketch capability)
- `list_diagnostic_codes({})` — return the 24-code diagnostic catalogue with hint templates (one-shot; useful at session start to pre-populate retry strategies).
- `lookup_cookbook({ query, k? })` — retrieve up to k canonical pattern snippets ranked by BM25; returns `{ ok, hits[] }`. Empty hits is a valid success ("no canonical pattern; proceed without cookbook help").
- `export_stl({ file? | code?, output_path, feature_id? })` — write a binary STL file server-side; returns `{ ok, output_path, byte_count, feature_count, diagnostics }`. `feature_count` is the total features in the script, not the count contributing to the exported shape.
- `params_list({})` — list symbolic parameters declared on the active evaluated session, including current value, default, type, and metadata.
- `params_update({ edits })` — edit one or more active-session params atomically and re-lower affected records; returns a shape preview, skipped/relowered record ids, and soft warnings.
- `solve_sketch({ entities, constraints })` — solve a 2D POINT/LINE/CIRCLE sketch constraint set; returns `{ ok, entities, constraints }` or validation errors. Side-effect-free.
- `add_constraint({ constraints?, constraint })` — validate and append one sketch constraint to a constraint list; returns the updated list. Side-effect-free.
- `list_constraints({ constraints? })` — list supported sketch constraint types (`COINCIDENT`, `DISTANCE`, `HORIZONTAL`, `VERTICAL`, `PARALLEL`, `PERPENDICULAR`, `EQUAL_LENGTH`, `TANGENT`, `RADIUS`, `ANGLE`, `CONCENTRIC`, `SYMMETRIC`) and echo the provided constraint list.

## Out of Scope

These return errors today; do not generate code that uses them:

- Tracked face/edge refs (only canonical refs and inline queries work) — deferred
- Asymmetric chamfer (only symmetric 45° supported) — deferred
- Draft features — deferred
- Dynamic assembly solving / motion simulation — deferred; static assembly parts, fixed connector placement, revolute joint metadata, and fused `assembly.model()` output are supported.
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
| parametric-bolt-pattern-skeleton | You want a compact bolt-hole part with an editable bolt-diameter parameter that can be changed later. |
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
