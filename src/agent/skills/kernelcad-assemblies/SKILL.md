---
name: kernelcad-assemblies
description: Multi-part assemblies — assembly(), parts, connectors, 7 mate types, fixed and revolute joints, .model()/.solvedModel(). Use for any model with two or more mechanical parts that need joint metadata.
---

# kernelCAD — assemblies

Use `assembly()` when the model needs named mechanical parts, connector frames, and joint metadata that a human or agent can inspect later. Call `.model()` after adding parts to return a `Scene` with per-part bodies; iterate `.parts` for per-part rendering / export, call `.toCompound()` for an OCCT group (lossless on color/name/identity, default for STEP), or `.toUnion()` for one fused solid (lossy on color/name — antipattern except when downstream truly needs a single Shape). Connector and joint records remain metadata for now; `.model()` does not solve motion (use `.solvedModel(poses)` for that). Use MCP `inspect({ of: 'assemblies', file? code? })` to inspect the captured assembly intent without recomputing topology.

## Assembly validity

`kernelcad validate <file.kcad.ts>` runs the assembly validator over the script's Scene. Three checks today:

- **`assembly.part.floating`** — a part has no joint connecting it to any other part. The fix: declare the connection via `arm.mate(..., 'fastened')` or `arm.mate(..., 'revolute', ...)`.
- **`assembly.part.orphan`** — a part is in a sub-assembly disconnected from the main mechanism.
- **`assembly.interference.overlap`** — two parts share volume (promoted from `kernelcad interference`).
- **`assembly.structure.unstructured-bodies`** (info) — a multi-body model returns loose top-level bodies with no `assembly().part(...)` structure, so the parts carry no identity for `inspect --focus`, `inspect({ of: 'part-stats' })`, or per-part review. The fix: wrap each distinct body in a named `assembly().part(name, shape)`.

Exit codes: 0 (solved) / 1 (warnings) / 2 (errors). Pipe-friendly:

```bash
kernelcad validate so100.kcad.ts && echo "fits"
```

Authoring rule: every `arm.part(name, shape)` should also appear in at least one `arm.mate(name, 'a.connector', 'b.connector', kind, opts)` call (kind ∈ `fastened` | `revolute` | `prismatic` | `ball`). Raw `at: [x, y, z]` placement without a mate produces a working geometric output but fails validation — the agent has authored a position but not a connection.

## Components from STEP files

When a real component (servo, bearing, gripper jaw, fastener) has a vendor-published STEP file, prefer `lib.fromSTEP(path)` over hand-authoring the silhouette from `box()` / `cylinder()`. Geometric fidelity matches the real part — bolt patterns, shaft positions, body cutouts — and the assembly tree carries that same fidelity through to renders, exports, and clash detection.

> For standard hardware (M-series fasteners, deep-groove ball bearings, NEMA steppers, pin headers, JST-XH connectors), prefer the bundled parts catalog over hand-authored connectors on a `lib.fromSTEP` import: load `kernelcad-parts`. The catalog's pre-shipped connector frames (`head-bearing`, `thread-tip`, `mating-face`, `inner-bore`, etc.) are part of the shipped record, so mates work without any `partRef.connector(...)` setup. The bracket-side `bolt-holes-N` auto-rule pairs with this — any `.holes(...)` feature emits matching frames.

```typescript
const servo = (await lib.fromSTEP('parts/sts3215.step')).color('servo');
const jaw   = await lib.fromSTEP('parts/so100-jaw.step');

const arm = assembly('so100');
arm.part('shoulder-servo', servo, { at: [0, 0, 0] });
arm.part('jaw', jaw.translate(0, 0, 50), { at: [0, 0, 0] });
```

Authoring rule: imported parts for vendor catalog geometry; `box`/`cylinder`/`extrude` for the printed/machined plates and brackets that connect them.

## Assembly intent API

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

arm.mate('shoulder', 'base.shoulder', 'link.root', 'revolute', { limitsDeg: [-90, 90] });

// Agent-natural: return the Scene directly. The CLI / studio walks .parts,
// the renderer paints per-part role colors, and STEP export uses
// .toCompound() under the hood. Reach for .toUnion() only if a downstream
// tool truly needs a single fused Shape (lossy on color/name/identity).
return arm.model();
```

### Per-part density

`arm.part(name, shape, { density })` accepts a per-part material density in `kg/m^3`. The default is `1000` (water-equivalent), which produces correct silhouettes but unrealistic dynamics for any metallic or plastic part. Declare density when the assembly will be exported to a downstream dynamics-aware format — `export_model({ format: 'urdf' })` or `export_model({ format: 'sdf-gazebo' })` emit a warning for any link that inherits the default.

Typical values: steel `7850`, aluminum `2700`, ABS plastic `1050`, brass `8500`, titanium `4500`.

```typescript
arm.part('shoulder-bracket', bracketShape, { density: 2700 });   // aluminum
arm.part('hub', hubShape, { density: 7850 });                    // steel
```

```typescript
interface Assembly {
  part(name: string, shape: Shape, opts?: {
    at?: [number, number, number];
    connectors?: Record<string, { origin: [number, number, number]; axis?: [number, number, number] }>;
    connect?: { connector: string; to: AssemblyConnectorRef; name?: string };
    /** Material density in kg/m^3. Default 1000 (water). */
    density?: number;
  }): AssemblyPartRef;
  connect(name: string, a: AssemblyConnectorRef, b: AssemblyConnectorRef): AssemblyConnectRef;
  mate(
    name: string,
    a: ConnectorRef,
    b: ConnectorRef,
    kind: 'fastened' | 'revolute' | 'prismatic' | 'ball' | 'cylindrical' | 'planar' | 'pin_slot',
    opts?: {
      limitsDeg?: [number, number];
      limitsMm?: [number, number];
      pose?: Editable<number> | [number, number, number];
      /** Gate 4 (joint visual exposure) declaration. Default 'exposed':
       *  the revolute must read as a hinge (fork daylight + pin stickout).
       *  Declare 'concealed' ONLY for mechanisms enclosed by design —
       *  valve rotors in bores, internal spindles, worm shafts — where
       *  fork daylight is structurally impossible. Never use it to
       *  silence a hinge that should be visible. */
      exposure?: 'exposed' | 'concealed';
    },
  ): AssemblyMateRef;
  model(): Scene;
  solvedModel(poses: Poses): Scene;
}
```

## Scene API

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
  // Mate-aware validator diagnostics attached when `solvedModel({}, { validate: 'warn' })`
  // runs (v0.6). Always present — empty array when validation is off or clean.
  readonly warnings: readonly ValidatorDiagnostic[];
  // Mate records declared via `arm.mate(name, aRef, bRef, type)` (v0.6).
  // Undefined when the assembly declared no mates.
  readonly mates?: readonly MateRecord[];

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

## Posing a kinematic chain

`assembly.solve(poses)` returns a `SolvedKinematics` handle that lets you both render the posed assembly and query per-part world transforms. `assembly.solvedModel(poses)` returns a posed `Scene` directly — iterate `.parts`, call `.toCompound()` for STEP, or `.toUnion()` only if a single fused Shape is required (lossy antipattern). Pose values accept `Editable<number>` per mate kind:

| Mate kind | Pose value type |
|---|---|
| `arm.mate(name, a, b, 'fastened')` | (none — accepts no pose) |
| `arm.mate(name, a, b, 'revolute', { limitsDeg? })` | `number` — degrees |
| `arm.mate(name, a, b, 'prismatic', { limitsMm? })` | `number` — mm |
| `arm.mate(name, a, b, 'ball', { limitsDeg? })` | `[xDeg, yDeg, zDeg]` — XYZ Euler |

Connector origins are in their owning **part's local frame** (URDF/MuJoCo convention). Multi-mate chains compose correctly; the FK tree-walk handles N joints.

**Companion rule — author each part's shape in its own part-local frame, NOT in world coordinates.** A part's local frame has its origin at the joint where this part attaches to its parent (or at the world origin, for the root part). All `.translate(x, y, z)` calls on the child's shape are interpreted in this *part-local* frame.

Concretely: if the shoulder joint is at world `(0, 0, 30)` and the lower arm has length 220 mm extending along +X from the shoulder, author the lower arm at part-local frame *centered on the joint*:

```ts
// ✅ Correct — lower arm in its own local frame; rest position comes from the connector origin.
const lower = arm.part('lower', box(220, 24, 18, true).translate(110, 0, 0));
base.connector('shoulderAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 30] }, axis: [0, -1, 0] });
lower.connector('shoulderAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, -1, 0] });
arm.mate('shoulder', 'base.shoulderAxis', 'lower.shoulderAxis', 'revolute', { limitsDeg: [0, 110] });

// ❌ Wrong — translating to the world rest position `(110, 0, 30)` puts a SHOULDER_Z offset
//    into the part-local frame, which the FK doubles up when the mate poses.
const lower = arm.part('lower', box(220, 24, 18, true).translate(110, 0, 30));
```

At rest (joint angle 0), worldT for `lower` equals `T(0, 0, 30)` (the joint origin in parent's frame), so part-local vertex `(110, 0, 0)` maps to world `(110, 0, 30)` — exactly what you wanted. Authoring the part with `.translate(110, 0, 30)` would put it at world `(110, 0, 60)` instead, and any non-zero joint angle would smear that compounding error visibly across the render.

The same convention applies to child-of-child joints: the elbow's parent-side connector origin is expressed in the lower arm's part-local frame (`[220, 0, 0]` — at the lower arm's tip, NOT `[220, 0, 30]`).

```ts
base.connector('baseYawAxis', { type: 'axis', origin: { kind: 'vec3', value: [45, 35, 8] }, axis: [0, 0, 1] });
shoulder.connector('baseYawAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('base-yaw', 'base.baseYawAxis', 'shoulder.baseYawAxis', 'revolute', { limitsDeg: [-120, 120] });

shoulder.connector('shoulderPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 90] }, axis: [0, 1, 0] });
elbow.connector('shoulderPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('shoulder-pitch', 'shoulder.shoulderPitchAxis', 'elbow.shoulderPitchAxis', 'revolute', { limitsDeg: [-45, 135] });

elbow.connector('elbowPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [110, 0, 0] }, axis: [0, 1, 0] });
wrist.connector('elbowPitchAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
arm.mate('elbow-pitch', 'elbow.elbowPitchAxis', 'wrist.elbowPitchAxis', 'revolute', { limitsDeg: [-120, 120] });

wrist.connector('wristToolFrame', { type: 'frame', origin: { kind: 'vec3', value: [75, 0, 0] } });
tool.connector('wristToolFrame', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.mate('wrist-tool', 'wrist.wristToolFrame', 'tool.wristToolFrame', 'fastened');
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
const snapScene = solved.toScene();               // snapshot Scene; call .toUnion() / .toCompound() to collapse to a Shape
```

**Limitations (v1):**
- **Numeric joint origins.** Joint origins are plain `Vec3`, not `EditableVec3`. Editing geometry params (e.g. `baseX`) reshapes parts but not joint frames; future slice will lift joint origins to `EditableVec3` once `setParamValue` reactivity is wired through.
- **One frame per part.** Joint origins are `Vec3` numeric, can't bind to faces/edges/vertices yet.
- **Body-tree only.** Each part has at most one parent joint; no closed-chain (4-bar linkage) kinematics.
- **Motion-limit review is validator/tooling-level.** `limitsDeg`/`limitsMm` are checked by pose-envelope review (`review_cad`, `validateMatePoseLimits`, or `solvedModel(poses, { posesGate: 'envelope' })`); raw `solve()` still computes the requested pose.
- Calling `solve()` twice on the same Assembly compounds transforms; build a fresh `assembly()` per pose query.

## Connectors and mates

Mates are the canonical assembly-topology vocabulary. Connectors are named coordinate frames embedded in a part; mates are typed relationships between two connectors. The validator and solver treat the mate graph as the source of truth for assembly topology. (The v0.5 `arm.fixed/.revolute/.prismatic/.ball(...)` helpers were removed in G0 — use the mate API exclusively.)

### Declaring connectors — `partRef.connector(name, opts)`

Chain `.connector(name, opts)` off a part-ref to register a mate-style connector on that part. Four connector types:

| Type | Carries | Used by mates |
|---|---|---|
| `frame`  | origin + normal | `fastened` |
| `axis`   | origin + axis   | `revolute`, `prismatic`, `cylindrical`, `pin_slot` |
| `planar` | origin + normal | `planar` |
| `ball`   | origin          | `ball` |

Connector origins can be a numeric `Vec3` or a topology query that resolves against the part's shape. Canonical face/edge names work today; non-canonical labels declared via `.faceLabels` propagate. Vertex queries are reserved for v0.7.

```typescript
const arm = assembly('arm');

// Numeric Vec3 origin — explicit coordinates in the part's local frame.
arm.part('base', basePlate)
  .connector('shoulder-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, PLATE_H / 2] },
    normal: [0, 0, 1],
  });

// Topology-bound origin — resolved from the part's geometry.
arm.part('servo', servoShape, { connectors: undefined })
  .connector('flange', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
    normal: [0, 0, 1],
  })
  .connector('shaft', {
    type: 'axis',
    origin: { kind: 'topology', query: { kind: 'edge-axis', name: 'edge-top' } },
    axis: [0, 0, 1],
  });
```

Topology queries: `face-center` / `face-normal` resolve canonical box/cylinder faces and any user-declared `faceLabels`. `edge-axis` resolves canonical box edges (`edge-<face1>-<face2>`, order insignificant) and cylinder cap edges (`edge-top` / `edge-bottom`). `vertex` raises `assembly.connector.topology-not-resolvable` with hint `vertex labeling not yet supported` — deferred to v0.7. Post-boolean shapes where the canonical face/edge no longer exists also surface `assembly.connector.topology-not-resolvable`.

The same topology origin can be expressed as a `@kc[...]` string ref — preferred for agent emission and cross-tool handoff because the resolver walks the lineage map first and falls back to the geometry snapshot when lineage is destroyed:

```typescript
arm.part('servo', servoShape)
  .connector('flange', {
    type: 'frame',
    origin: '@kc[servo/face/bottom]',
    normal: [0, 0, 1],
  })
  .connector('shaft', {
    type: 'axis',
    origin: '@kc[servo/edge/top]',
    axis: [0, 0, 1],
  });
```

`@kc[<part>/face/<name>]` defaults to face-center; `@kc[<part>/face/<name>#normal]` selects the face-normal vector. `@kc[<part>/edge/<name>]` maps to edge-axis. Both the string form and the structured form live in the same connector-origin slot; the structured form remains the escape hatch for batch authoring or programmatic construction. Full grammar — kinds, modifiers, indexed segments, reserved characters, and resolution semantics — lives in `kernelcad-mcp/SKILL.md` under "Topology references". The discovery primitive is `query({ mode: 'resolve' })`.

### Declaring mates — `arm.mate(name, aRef, bRef, type)`

Refs are `"<partName>.<connectorName>"` strings. The seven mate types each require a specific connector-type pair; the wrong pair throws at capture time (early error).

| Mate type | DOF removed (of 6) | Compatible connector pair |
|---|---|---|
| `fastened`    | 6 | `frame`-`frame` |
| `revolute`    | 5 | `axis`-`axis` |
| `prismatic`   | 5 | `axis`-`axis` |
| `cylindrical` | 4 | `axis`-`axis` |
| `planar`      | 3 | `planar`-`planar` |
| `ball`        | 3 | `ball`-`ball` |
| `pin_slot`    | 4 | `axis`-`axis` |

```typescript
arm.mate('shoulder-bolts',  'shoulder-servo.base-mount',  'base.shoulder-mount', 'fastened');
arm.mate('shoulder-rotate', 'shoulder-servo.output-shaft', 'horn.shaft-hub',     'revolute');
```

Mate refs accept either the legacy `"<partName>.<connectorName>"` dot form OR the `"@kc[<partName>/connector/<connectorName>]"` topology-ref string form. Both resolve identically; the `@kc[...]` form is preferred when emitting refs through MCP (`add_mate`) or pasting refs that came out of `inspect({ of: 'assembly' })`:

```typescript
arm.mate('shoulder-bolts',
  '@kc[shoulder-servo/connector/base-mount]',
  '@kc[base/connector/shoulder-mount]',
  'fastened',
);
```

Couple scalar articulated mates when one actuator should drive multiple finger/jaw joints. The driven pose is `sourcePose * ratio + offset`; explicit numeric `solve_mates({ poses })` overrides for a driven mate still win for debugging.

```typescript
arm.mate('grip', 'palm.driver', 'grip-driver.axis', 'revolute', {
  limitsDeg: [0, 40],
});
arm.mate('left-curl', 'palm.left-hinge', 'left-finger.hinge', 'revolute');
arm.mate('right-curl', 'palm.right-hinge', 'right-finger.hinge', 'revolute');
arm.coupleMates('left-curl', { source: 'grip', ratio: 1 });
arm.coupleMates('right-curl', { source: 'grip', ratio: -1 });
```

Use this for two-finger grippers and simple underactuated fingers before hand-authoring duplicated pose params. Coupling supports scalar mates: `revolute`, `prismatic`, `cylindrical`, and `pin_slot`.

Capture-time errors throw `KernelError('feature.invalid-args')` with structured hints:

- `invalid-args.assembly.mate-type-mismatch` — the chosen mate type doesn't match the connector pair (e.g. `revolute` on `frame`-`frame`). Recovery: pick a compatible mate type or change the connector types.
- `invalid-args.assembly.mate-connector-not-found` — the `"part.connector"` ref is malformed, the part is undeclared, or the connector wasn't registered. Recovery: declare the part / register the connector before calling `arm.mate(...)`.

### Validator — `validateAssemblyWithMates`

The mate-aware validator walks the assembly's parts + joints + mate graph and returns one of five statuses:

| Status | Meaning |
|---|---|
| `solved`              | Mate graph is consistent and fully constrains the assembly. |
| `under-constrained`   | One or more parts have residual DOF — declare more mates. |
| `over-constrained`    | Mates mutually contradict — remove or relax one. |
| `redundant-ok`        | Mates over-determine the pose but agree — info-severity diagnostic, prune for hygiene. |
| `did-not-converge`    | Newton-Raphson iter-cap hit (closed articulated loops). |

Six diagnostic codes on `ValidatorDiagnostic`:

- `assembly.part.under-constrained` — part has residual DOF after mate graph.
- `assembly.mate.over-constrained` — mate pair contradicts the rest of the graph.
- `assembly.mate.type-mismatch` — connector-pair / mate-type mismatch at capture.
- `assembly.mate.connector-not-found` — malformed ref / unknown part / unknown connector.
- `assembly.loop.unclosed` — reserved (type-only today).
- `assembly.solver.did-not-converge` — Newton-Raphson hit the iter-cap.

### Validation gate on `solvedModel`

`solvedModel(poses, { validate })` runs the validator before returning the `Scene`:

| Mode | Behavior |
|---|---|
| `'warn'`  | (default) Attaches every diagnostic — error/warning/info — to `scene.warnings`. Never throws. |
| `'error'` | Throws `KernelError('feature.invalid-args')` on the first error-severity diagnostic. `scene.warnings` is empty on success. |
| `'off'`   | Skip validation entirely. `scene.warnings` is the empty array. |

`kernelcad evaluate` flips the default to `'error'` via the `KERNELCAD_VALIDATE_DEFAULT=error` env var, so authoring scripts surface malformed assemblies as CLI failures.

Under `validate:'error'`, kinematic grounding gates fire — mounting-hole consistency, joint-axis binding, declared-load capacity, joint visual exposure.

```typescript
const scene = await arm.solvedModel({}, { validate: 'warn' });
for (const w of scene.warnings) {
  console.log(w.code, w.message, w.hint);
}
```

#### Worked example — reading a Gate 1 hint and repairing the mate

A common Gate 1 failure: a `fastened` mate names two faces, but the holes drilled on those faces don't match (different diameters, different depths, or one side has no hole at all). The diagnostic carries everything the agent needs to fix the source — no second tool call required.

```typescript
// BROKEN — base plate has an M5 clearance hole (Ø5 mm); bracket has Ø6 mm.
const base = kcad.box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
const bracket = kcad.box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
arm.part('base', base).connector('mount', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
arm.part('bracket', bracket).connector('mount', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
arm.mate('screw', 'base.mount', 'bracket.mount', 'fastened');

// Emits assembly.mounting-hole.mismatch (info — advisory; the merge gate is
// mechanism.disconnect under the physics-grounded loop) with hint:
//   "invalid-args.assembly.mounting-hole-mismatch — mate 'screw' (fastened) expects
//    compatible hole features on both bound faces. Side 'base.mount': Ø5 mm through.
//    Side 'bracket.mount': Ø6 mm through. Adjust the diameter or depth on the side
//    that does not match, or change the connector origin to a face that already
//    exposes a matching hole."
const scene = await arm.solvedModel({}, { validate: 'error' });
// scene.warnings contains the assembly.mounting-hole.mismatch (severity 'info')
```

The hint names the mate, both connectors, both observed hole specs, and the two recovery moves. The fix is to make `bracket`'s hole `diameter: 5` (matching the base) — one edit, no further introspection needed.

### MCP companions

The MCP server exposes assembly-specific tools for runtime introspection:

- `inspect({ of: 'assembly', file? | code?, assembly? })` — evaluate a script and return a physical inventory: named parts, bounding boxes, connectors, mates, mechanical review facts, disconnected solids, and `unexplainedGeometry`. Use this before accepting a mechanism that looks suspicious in Studio; random boxes/floating fragments must either disappear or be explicitly justified by the original design goal.
- Source-edit authoring (durable — this is how a mechanism persists in the user's `.kcad.ts`; each tool inserts/replaces source text, returns `new_code`, and includes diagnostics from re-evaluating it — persist the returned `new_code`): `add_part`, `add_connector`, `add_mate`, `add_workspace_target`, `set_scene_return`.
- `add_part({ code, assembly_binding, part_name, shape_expression, binding_name?, at? })` — insert `const <binding> = <assembly>.part(partName, shapeExpression, opts?)`. Returns the part binding used by `add_connector`.
- `add_connector({ code, part_binding, name, type, origin, axis?, normal? })` — insert `<partBinding>.connector(name, { type, origin, axis?, normal? })`. `type` is one of `frame`/`axis`/`planar`/`ball`; `origin` accepts a `[x, y, z]` shorthand or a structured `ConnectorOrigin`. Use the part binding returned by `add_part`.
- `add_mate({ relation, code, assembly_binding, ... })` — author a mate-graph relationship into source. `relation: 'mate'` → `{ name, a, b, type, pose?, limitsDeg?, limitsMm? }` (refs `"<partName>.<connectorName>"`); `relation: 'coupling'` → `{ driven, source, ratio, offset? }`; `relation: 'transmission'` → `{ name, kind, sourceMate, drivenMates, path, ... }`.
- `inspect({ of: 'mates', assembly? })` — return the declared mate records as `{ mates: [{ name, a, b, type, pose?, limitsDeg?, limitsMm? }, ...] }`. Read-only.
- `verify({ check: 'assembly', assembly? })` — run `validateAssemblyWithMates(arm)` and return `{ status, diagnostics, partCount, jointCount }`. Each diagnostic carries `code` and `hint` for recovery.
- `solve_mates({ assembly?, poses? })` — run the mate-graph solver and return `{ status, poses, iterations? }`. `poses` overrides mate pose values by mate name; coupled driven mates are expanded from their source mate before solve.
- `review_cad({ file? | code?, assembly?, includePoseEnvelope?, includeInterference?, epsilonMm3?, trackConnectors?, gripperAperture? })` — run the deterministic agent review loop: evaluate, validate mates, sample declared pose limits, check that mate connectors touch modeled material, report connector workspace bounds, and return raw diagnostics plus a fitness summary (`fitness.functional`, `fitness.blockingReasons`, `fitness.mechanismSummary`) after an assembly is selected. Pass `trackConnectors: ['gripper-plate.tool-tip']` to focus workspace output on an end-effector; connector workspace is only computed when pose-envelope sampling is enabled. For grippers, pass `gripperAperture: { left: 'left-finger.tip', right: 'right-finger.tip' }` to get `minMm`, `maxMm`, `travelMm`, and per-sample fingertip distances.
- `design_loop({ goal, attempts, assembly?, preserveInterfaces?, includePoseEnvelope?, includeInterference?, epsilonMm3?, trackConnectors?, gripperAperture?, stopOnPass?, allowReviewWarnings?, requireVisualReview?, outputRecordPath?, recordTitle? })` — run ordered design attempts through `review_cad`, continue past functional attempts that still have unresolved non-visual warnings, return repair prompts, and optionally write a Studio replay record. Visual review is required by default: each accepted attempt must include `visualReview: { accepted, screenshotPath, findings, checks }` after the vision-capable agent renders/opens screenshots and records concrete observations. Accepted reviews must pass these checklist codes: `main-object-count`, `proportions-match-reference`, `required-visible-features`, `no-stray-or-floating-geometry`, `attachment-plausibility`, `semantic-orientation-alignment`, `device-depth-and-construction`, and `canonical-views-physically-coherent`. Missing `screenshotPath`, empty `findings`, missing checklist entries, or blank check findings fails with `assembly.visual.review-incomplete`; weak check evidence fails with `assembly.visual.review-evidence-weak`; failed checks fail with `assembly.visual.review-check-failed`. Visual review warnings cannot be allow-listed. Use `requireVisualReview: false` only for explicit non-visual batch checks. Only use `allowReviewWarnings` when the original prompt explicitly permits that non-visual warning code.

## Pose-envelope review

The default `solvedModel(poses, { validate })` gate only checks the single pose you passed in. Mechanisms fail in the wild because they clash, leave their connector untouched, or break the solver at the *extremes* of declared mate travel — poses that the default gate never visits. The pose-envelope review samples every mate with declared `limitsDeg` / `limitsMm` and runs the same validator + interference + connector-contact checks at each sample.

### `solvedModel(poses, opts)` parameters

```typescript
arm.solvedModel(poses, {
  validate?: 'warn' | 'error' | 'off',     // existing — controls severity
  posesGate?: 'default' | 'envelope',      // which poses the gate covers
  samplesPerMate?: number,                  // forwarded to the envelope sweep
  combinatorial?: boolean,                  // forwarded to the envelope sweep
});
```

`validate` and `posesGate` are orthogonal:

| `validate` | `posesGate` | Behavior |
|---|---|---|
| `'off'`   | (any)        | No validation. `scene.warnings` is the empty array. |
| `'warn'`  | `'default'`  | (default) Default-pose validator only. Diagnostics attach to `scene.warnings`. |
| `'warn'`  | `'envelope'` | Default-pose validator runs, then `reviewPoseEnvelope` runs over sampled poses. All diagnostics — including envelope errors — attach to `scene.warnings`. Never throws. |
| `'error'` | `'default'`  | Default-pose validator throws on the first error-severity diagnostic. |
| `'error'` | `'envelope'` | Default-pose validator runs first; if clean, the envelope review runs and any envelope-error diagnostic throws `KernelError('feature.invalid-args')` with a message listing the failing code counts (e.g. `pose-envelope errors: assembly.pose-envelope.interference (x3)`) and the first offender's hint. |

`scene.warnings` is typed `SceneDiagnostic[]` — the union `ValidatorDiagnostic | PoseEnvelopeDiagnostic` — so an envelope-mode warn-run lets you iterate every sample's findings without losing the validator entries.

### `samplesPerMate` — interior coverage

`samplesPerMate` is the **total** sample count per non-locked mate. The endpoint pair is always emitted; interior points are added only at `N >= 3`.

| `samplesPerMate` | Samples per mate with declared limits |
|---|---|
| `1` (default) | `{min, max}` — corners only |
| `2`           | `{min, max}` — identical to `1` (no room for interior) |
| `3`           | `{min, midpoint, max}` |
| `N >= 3`      | `{min, plus N-2 uniform interior points, max}` |

A revolute with `limitsDeg: [-90, 90]` and `samplesPerMate: 4` produces poses at `-90, -30, 30, 90`. Use this when the worst pose isn't at a corner — long links sweeping through air gaps, or interference that only shows up mid-stroke.

### `combinatorial` — corner-tuple sweep

`combinatorial: true` enumerates all `2^M` min/max combinations across mates with declared limits, where `M` is the count of limited mates. This catches diagonal interference: two joints that are each clean at their own corners but collide when both go to their extremes simultaneously.

Footgun: solve cost scales as `2^M`. `M=8` is 256 solves; `M=9` throws synchronously from `buildPoseEnvelopeSamples` with `combinatorial sampling capped at 8 mates with declared limits; got <N>. Use samplesPerMate for higher-DOF mechanisms.` Reach for `combinatorial` only when you've already minimized declared-limit mates, or for a small sub-assembly under design review.

`samplesPerMate` and `combinatorial` compose: enable both for interior coverage plus worst-pose diagonal detection.

### Diagnostic shape and `sampleStrategy`

Envelope diagnostics carry a `sampleStrategy` field so downstream tools (Studio review panes, repair-loop summarizers) can tell which sweep family caught the failure:

```typescript
interface PoseEnvelopeDiagnostic {
  readonly code: PoseEnvelopeDiagnosticCode;
  readonly severity: 'warning' | 'error';
  readonly message: string;
  readonly hint: string;
  readonly sampleName?: string;
  readonly sampleStrategy?: 'corner' | 'interior' | 'combinatorial';
  readonly mateName?: string;
  readonly pose?: number | [number, number, number];
  readonly limits?: readonly [number, number];
  readonly partA?: string;
  readonly partB?: string;
  readonly volumeMm3?: number;
  readonly connectorRef?: string;
}
```

`sampleStrategy` classification: `<mate>:min` / `<mate>:max` / `current` → `'corner'`; `<mate>:interior-<i>` → `'interior'`; `corner:<bitmask>` → `'combinatorial'`. Five emitting codes:

- `assembly.pose.out-of-limits` — a sample pose fell outside the mate's declared `limitsDeg`/`limitsMm`. Hint: `invalid-args.assembly.pose-out-of-limits — clamp '<mate>' to [<min>, <max>] or widen the mate limits if the mechanism is intended to travel that far.`
- `assembly.pose-envelope.solve-failed` — solver reported `over-constrained` / `did-not-converge` at this sample. Hint: `invalid-args.assembly.pose-envelope-solve-failed — repair the mate graph or reduce declared travel before trusting this mechanism range.`
- `assembly.pose-envelope.interference` — sampled pose makes two parts overlap by more than `epsilonMm3`. Hint: `invalid-args.assembly.pose-envelope-interference — add clearance, reduce mate travel, or move the connector/mount geometry so the swept pose stays collision-free.`
- `assembly.pose-envelope.connector-unresolved` — a tracked connector has a topology-based origin and was skipped from workspace bounds. Hint: `invalid-args.assembly.pose-envelope-connector-unresolved — use a numeric vec3 connector origin for workspace review, or run a lowerer-backed topology resolver before requesting this connector.`
- `assembly.gripper-aperture.connector-missing` — one or both fingertip connector refs weren't observed. Hint: `invalid-args.assembly.gripper-aperture-connector-missing — pass gripperAperture refs that exist as numeric frame connectors and are included in pose-envelope samples.`

### Worked example

A single-link hinge that clashes only at the upper limit:

```typescript
const base  = arm.part('base',  box(60, 60, 8));
const link  = arm.part('link',  box(80, 12, 8).translate(40, 0, 8));
base.connector('hinge-base', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 8] }, axis: [0, 0, 1] });
link.connector('hinge-end',  { type: 'axis', origin: { kind: 'vec3', value: [-40, 0, 0] }, axis: [0, 0, 1] });
arm.mate('hinge', 'base.hinge-base', 'link.hinge-end', 'revolute', {
  limitsDeg: [-30, 175],   // 175 sweeps the link into the base
});

const scene = await arm.solvedModel({}, {
  posesGate: 'envelope',
  samplesPerMate: 4,
  validate: 'error',
});
// Throws KernelError('feature.invalid-args'):
//   "solvedModel: pose-envelope errors: assembly.pose-envelope.interference (x1)"
//   hint: invalid-args.assembly.pose-envelope-interference — add clearance, …
```

Switching to `validate: 'warn'` returns a Scene whose `warnings` array contains the same diagnostic with `sampleStrategy: 'corner'`, `sampleName: 'hinge:max'`, `partA: 'base'`, `partB: 'link'`, and the overlap volume. Repair: tighten `limitsDeg` to e.g. `[-30, 90]`, or move the link's origin.

### CLI surface

`kernelcad evaluate <file> [--envelope] [--samples-per-mate N] [--combinatorial]` runs the envelope review across every captured assembly. Exit 0 (clean) / 1 (script error, or sampling flags used without `--envelope`) / 2 (envelope-error diagnostics surfaced). Passing `--samples-per-mate` or `--combinatorial` without `--envelope` is rejected to prevent silent no-ops.

### MCP surface

`review_cad` and `design_loop` accept `samplesPerMate` (integer ≥ 1) and `combinatorial` (boolean) with the same semantics as the script API. `review_cad` also returns `repairContext` on both `ok: true` and `ok: false` branches:

```typescript
interface RepairContext {
  readonly blockingReasons: readonly string[];    // formatted "code: message"
  readonly topDiagnostics: ReadonlyArray<{
    readonly code: string;
    readonly sampleName?: string;
    readonly mateName?: string;
    readonly suggestedDelta?: { mate: string; widenBy?: number; narrowBy?: number };
  }>;
  readonly preserveInterfaces: readonly string[];
  readonly designGoal: string;
}
```

`suggestedDelta.widenBy` / `narrowBy` are in **degrees for revolute / cylindrical / pin_slot mates, mm for prismatic mates** — the same unit as the diagnostic's `limits` field. `design_loop` renders its `nextActionPrompt` directly from this context: blocking reasons first, then the top three diagnostics with explicit `widen by N` / `narrow by N` directives when a suggested delta is present.

### Known limitations

- **Sampled bounds, not analytic.** `connectorWorkspace.min` / `.max` are AABB extremes computed from the sampled poses. Sparse sampling (`samplesPerMate: 1`) understates the true reachable region because the worst pose isn't always at a corner. For workspace-critical claims, use `samplesPerMate >= 4` and/or `combinatorial: true` on the limited DOF subset.
- **Numeric vec3 connectors only for workspace.** Topology-bound connector origins surface `assembly.pose-envelope.connector-unresolved` (warning) and are skipped from `connectorWorkspace`. Switch the tracked connector to `{ kind: 'vec3', value: [...] }` for inclusion.
- **`limitsDeg`/`limitsMm` required.** Mates without declared limits are not sampled — they contribute only the `current` pose. The pose-envelope review is silent on infinite-travel mates by design.

### Declarative workspace targets — `arm.workspace(connectorRef, opts)`

v0.7 Slice 1 adds a capture-time API for declaring "this connector MUST be able to reach these world-frame points across the mechanism's declared mate-limit range":

```typescript
arm.workspace('elbow_tip', {
  reachable: [[200, 0, 100], [0, 200, 100], [-200, 0, 100]],
  toleranceMm: 5,   // optional, default 5
});
```

Behavior:

- The capture-time call records intent only — no kernel call, no synchronous failure.
- At validate-time, when `solvedModel({}, { validate: 'error', posesGate: 'envelope' })` produces a sampled `ConnectorWorkspace`, the validator checks each declared target against the matching connector's sampled AABB minus `toleranceMm`. If a target lies further outside than tolerance, the validator emits `assembly.workspace.unreachable` (severity `error`) carrying the target, the delta in mm, the closest sampled point, and a recovery hint.
- When `arm.workspace(...)` is declared without `posesGate: 'envelope'`, the gate is inert and emits one `info`-severity entry per declaration pointing the agent at the `posesGate` opt.
- AABB-only containment in this slice; a target inside the AABB but outside the true (convex) reachable hull is NOT flagged — convex-hull refinement is queued for the next slice.
- The connector ref must name an existing connector with a numeric `vec3` origin. Topology-bound origins are skipped by the envelope sampler (which also raises `assembly.pose-envelope.connector-unresolved` for them); the workspace gate emits a distinct `assembly.workspace.unreachable` (error) on the targeted declaration so the recovery hint points at THIS declaration, not just the generic envelope warning.

## Drive transmissions

Mate coupling is not physical transmission. If you use `arm.coupleMates(driven, { source, ratio })`, also declare how motion gets from the actuator/input mate to the driven output:

```typescript
arm.transmission('left-finger-drive-linkage', {
  kind: 'link-rod',
  sourceMate: 'grip',
  drivenMates: ['left-curl'],
  actuator: 'grip-servo',
  input: 'grip-driver',
  output: 'left-finger',
  path: ['grip-driver', 'left-hinge-pin', 'left-finger'],
  ratio: -1,
});
```

`kind` is one of `direct-horn`, `link-rod`, `four-bar`, `gear-pair`, `belt`, or `tendon`. The `path` names the physical parts that transmit motion/load. A coupled mate without a matching transmission fails `review_cad` with `assembly.transmission.missing-for-coupled-mate`. Consecutive `path` parts must also stay near-contact adjacent across sampled mate travel; a jump through empty space or a visible air gap fails with `assembly.transmission.path-disconnected`.

## Fresh-agent mechanism loop

When a user asks for a robot arm, hand, gripper, linkage, or other physical mechanism, do not start by polishing a mesh. Start from a script that returns an `assembly(...).model()` or `.solvedModel(...)`, then run this loop:

1. Build named, purpose-bearing parts. Every visible solid should be a base, bracket, servo/motor body, shaft/pin, bearing/clevis/knuckle, link, palm, finger, fixture, or clearly named end-effector part.
2. Declare connector frames and mates on the parts that carry load. Prefer revolute/prismatic/fastened mates with limits over visually aligned free geometry.
3. If one mate drives another, declare both `coupleMates(...)` and `transmission(...)`; the coupling is the kinematic ratio, the transmission is the physical drive path. Do not jump directly from a servo horn to a distant finger; include the real adjacent horn/link/gear/belt/tendon/support parts in `path`.
4. Run `inspect({ of: 'assembly', file })`. If `unexplainedGeometry` is non-empty, redesign before continuing unless the original prompt explicitly allows the disconnected geometry and you document why.
5. Run `review_cad({ file, designGoal, preserveInterfaces, trackConnectors, gripperAperture? })`. Treat `fitness.functional === false`, `fitness.blockingReasons`, connector-not-in-solid, unsupported revolutes, missing mate contact, missing drive transmission, pose-limit failures, and interference pairs as repair facts, not optional style feedback.
6. Run `design_loop({ goal, attempts, outputRecordPath? })` when comparing mechanism attempts or creating a Studio replay. Visual review is mandatory by default; a pass means functional, quality-clean, and screenshot-reviewed. A merely renderable model is not enough.
7. Only after the deterministic tools are clean should you open Studio or a screenshot for visual review. If the image still shows arbitrary fragments, go back to `inspect({ of: 'assembly' })` and make the fragment inventory explainable.

For robot arms specifically, preserve at least these interfaces between repair attempts when present: base yaw mate, shoulder pitch mate, elbow pitch mate, wrist/grip mate, tool-tip connector, and fingertip connectors. Track the tool-tip workspace and gripper aperture so the review proves movement, not just static contact.

## Mechanism delivery — non-bypassable

A mechanism build is **not deliverable** if any of these fail. No `ignore[]` workarounds for joint pairs; no shipping with a render that looks right while the assembly is broken.

1. `kernelcad validate --include-interference` returns CLEAN. `ignore[]` is reserved for true intra-part design contacts (a spring "bolted" to a beam, a captured washer); joint-pair contacts (the parts on either side of a `revolute` / `prismatic` mate) **may not be ignored** — they are the test signal for whether the mechanism is physically realized.
2. Every declared mate passes Gate 6 (mate physical realization): the pin/equivalent feature actually constrains the two parts, the pin stays in both holes at every pose in the mate's limits, and bearing surfaces align. Surfaces an advisory `assembly.mate.not-physically-realized` (`info` severity; revolute / prismatic only; `fastened` mates are exempt). The merge gates under the physics-grounded loop are `mechanism.disconnect` and `mechanism.interpenetration`, which fire under motion at validate-time. `joint.clevis(...)` passes by construction.
3. Every revolute joint passes Gate 4 (visual exposure): the hinge mechanism reads as a hinge from at least one canonical view. Enclosed-by-design rotors (valve tubes in bores, internal spindles) declare `exposure: 'concealed'` on the mate instead of faking fork daylight.
4. The render-inspect loop is followed: a `kernelcad render inspect` pass after every geometry change, with visible issues called out.
5. (Opt-in) `kernelcad validate --include-interference --include-physics` adds the MuJoCo-based physics gate. Two extra failure codes: `mechanism.unstable-under-gravity` (non-finite required torque at a sampled pose) and `mechanism.drops-on-release` (joints drift > 5° or bodies translate > 50 mm in a 0.5 s drop-test from rest). Bare revolutes without a closed-loop spring / declared actuator fail this gate; single-body springs fastened to one arm don't help — see issue #361 (closed-loop tendon API).

If any of these fail, iterate the design until they pass. Do not widen `ignore[]`. Do not ship.

### Use `joint.clevis(...)` for revolute joints — do not hand-roll forks

The `kc.joint.clevis({...})` primitive builds the canonical revolute-joint hardware (two fork plates on the parent, one tongue on the child, a pin drilled through both knuckles) guaranteed correct by construction: bridge tabs outside the tongue's swing envelope, through-hole drilled in a single subtract after the fork and tongue are unioned in, and pin cap heads flush against the outer fork faces.

```ts
const shoulder = joint.clevis({
  parentBody: baseBody,
  childBody: lowerBeam,
  axis: [0, -1, 0],
  pivotParent: [0, 0, COLUMN_TOP_Z],
  pivotChild: [0, 0, 0],
  limitsDeg: [-10, 110],
  style: { knuckleR: 14, forkGapY: 18, tongueY: 14, plateT: 4, pinR: 3.5 },
});

// shoulder.parentGeometry / .childGeometry are the bodies (assign to each part)
// shoulder.parentConnector / .childConnector carry { origin, axis } for the mate
```

See `kernelcad-kinematic/SKILL.md` for the full pattern and the lamp-class worked example (`examples/kinematic/luxo-lamp.kcad.ts`).

## Diagnostic codes

| Code | Source |
|------|--------|
| `assembly.part.floating` | validate — part has no joint |
| `assembly.part.orphan` | validate — part is in a disconnected sub-assembly |
| `assembly.interference.overlap` | validate — two parts share volume |
| `assembly.part.under-constrained` | mate validator — residual DOF |
| `assembly.mate.over-constrained` | mate validator — contradicting mate pair |
| `assembly.mate.type-mismatch` | capture-time — wrong mate type for connector pair |
| `assembly.mate.connector-not-found` | capture-time — unknown part or connector ref |
| `assembly.loop.unclosed` | mate validator — reserved |
| `assembly.solver.did-not-converge` | mate validator — Newton-Raphson iter-cap |
| `assembly.connector.topology-not-resolvable` | connector declaration — unresolvable topology query |
| `assembly.transmission.missing-for-coupled-mate` | review_cad — coupled mate without transmission |
| `assembly.transmission.path-disconnected` | review_cad — transmission path has air gap |
| `assembly.pose.out-of-limits` | pose-envelope — sample fell outside declared mate limits |
| `assembly.pose-envelope.solve-failed` | pose-envelope — solver hit over-constrained / did-not-converge at sample |
| `assembly.pose-envelope.interference` | pose-envelope — sampled pose overlaps two parts |
| `assembly.pose-envelope.connector-unresolved` | pose-envelope — tracked connector has topology-based origin |
| `assembly.gripper-aperture.connector-missing` | pose-envelope — fingertip connector ref not observed |
| `assembly.visual.review-incomplete` | design_loop — missing screenshot/findings/checklist |
| `assembly.visual.review-evidence-weak` | design_loop — accepted visual checklist text lacks concrete evidence |
| `assembly.visual.review-check-failed` | design_loop — a visual checklist check failed |
| `assembly.joint-axis.unbound` | solvedModel — advisory (`info`): revolute/prismatic/cylindrical axis floats outside both bound parts' BREP. Merge gate: `mechanism.dof-mismatch`. |
| `assembly.joint.load-exceeded` | solvedModel({validate:'error'}, { externalLoads }) — declared `maxLoad` exceeded by external force/torque |
| `assembly.mounting-hole.mismatch` | solvedModel — advisory (`info`): `fastened` mate's two bound faces lack compatible hole features. Merge gate: `mechanism.disconnect`. |
| `assembly.joint.not-visible` | solvedModel({validate:'error'}) — revolute joint's fork+tongue+pin collapses into one visual block (fork-plate gap < 15% of plate extent OR pin stickout < 1.0 × PIN_R). Hint payload carries actual gap ratio and pin-stickout numbers so the agent can widen FORK_GAP_Y / shrink TONGUE_Y / extend PIN_LEN directly. Microscale joints (combined bounding sphere < 5 mm) skip the gate. |
| `assembly.workspace.unreachable` | solvedModel({validate:'error', posesGate:'envelope'}) — `arm.workspace(...)` declared target lies outside the connector's sampled pose-envelope AABB (minus toleranceMm). Severity is `info` when the gate runs without an envelope (declarations are inert until `posesGate:'envelope'`). AABB-only containment in v0.7 Slice 1; convex-hull check queued for Slice 2 |

## Cookbook — Query DSL for assemblies

Each snippet below ships as a runnable `.kcad.ts` file under `src/agent/skills/kernelcad-assemblies/cookbook/snippets/`. The smoke test at `tests/integration/mcp/queryCookbookSmoke.test.ts` evaluates every snippet on every CI run.

### Q-S4 — Ownership filters and Part Queries

In an assembly, every face / edge / vertex belongs to exactly one part. `q.ownedByPart(...)` narrows a face Query to a specific part without naming a topology by hand — the per-variant topology can shift while the part label stays stable.

```typescript
const arm = assembly('bracket-mount');
arm.part('bracket', box(20, 20, 10, false, { faceLabels: { mount: 'top' } }));

// "The bracket part."
const bracket = q.part().and(q.withFeatureName('bracket'));

// "Faces on the bracket part."
const bracketFaces = q.face().and(q.ownedByPart(bracket));

// "The bracket's mount face."
const mountFace = q.face()
  .and(q.ownedByPart(bracket))
  .and(q.withLabel('mount'));
```

See `cookbook/snippets/Q-S4-ownership-and-part-queries.kcad.ts`.

### Q-S5 — Connector Queries for mate-side targeting

`q.connector(...)` composed with `q.ownedByPart(...)` and `q.withLabel(...)` is the canonical pattern for identifying a connector on a specific part by label. The Query value is a descriptor today; consumer integration on `arm.mate(...)` ships in a later slice, so the string form (`'partName.connectorName'`) remains the consumed surface in parallel.

```typescript
const baseSide = q.connector()
  .and(q.ownedByPart(q.part().and(q.withFeatureName('base'))))
  .and(q.withLabel('mount'));

const bracketSide = q.connector()
  .and(q.ownedByPart(q.part().and(q.withFeatureName('bracket'))))
  .and(q.withLabel('flange'));

// Consume by string ref today; the Query value above describes the same
// connector and round-trips through JSON for diagnostic use.
arm.mate('attach', 'base.mount', 'bracket.flange', 'fastened');
```

See `cookbook/snippets/Q-S5-connector-queries.kcad.ts`.

## Verification gates

After authoring a multi-part assembly, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 — no `assembly.*` diagnostics |
| G-no-interference | `kernelcad interference` reports zero pairs — non-clashing models are mandatory for harness gates |
| G-frame-not-floating | Every part is reachable in the mate graph from at least one fixed or grounded connector — disconnected parts fail Solvespace-style 5-way status |
| G-mate-pair-compatible | Each `arm.mate(a, b, type, …)` connects two connectors whose types are compatible with the mate type (capture-time validation surfaces `assembly.mate.type-mismatch`) |
| G-pose-paramref-bound | If pose ParamRefs are used for revolute / prismatic mates, each ParamRef is declared at script top with `param('joint-name', default, { min, max })` |
| G-solvedmodel-reactive | After `arm.solvedModel({validate: 'error'})`, param updates trigger fresh Scene emission — verify by running `params_update` via MCP and re-rendering; positions must change |

## Related skills

- `kernelcad-authoring` — Parts wrap Shapes built by primitives + sketches + features.
- `kernelcad-params` — pose ParamRefs drive mate angles reactively.
- `kernelcad-features` — features apply per part inside the assembly the same way as standalone Shapes.
- `kernelcad-mcp` — `inspect({ of: 'assemblies' })` inspects captured intent without re-evaluating.
