---
name: kernelcad-features
description: Edge and face features — fillet, chamfer, shell, face refs through operations, holes, cutouts. Use when adding rounded edges, recesses, bolt patterns, or carved profiles to a kernelCAD model.
---

# kernelCAD — edge and face features

## Face refs through operations

Canonical face refs (`{ face: 'top' }`, etc.) work transparently across transforms (`.translate`, `.rotate`, `.scale`, `.reflect`, `.mirror`) and unambiguous booleans (`.subtract`, `.union`, `.intersect`). The kernel walks each face's lineage back to its originating primitive and forward through history.

Two cases produce explicit diagnostics:

- `feature.face-ref.ambiguous-after-split` — an upstream boolean split the named face into multiple children (e.g., a divider cut splits `top` into two halves). Geometry-fallback disambiguation is planned for a future release; current workaround: apply the edge/face feature before the splitting operation, or use a query-based selector.
- `feature.face-ref.removed` — an upstream boolean removed the named face entirely. Reference a different face that still exists in the current shape.
- `feature.hole.no-target-face` — the hole entry face matched, but no body sits along the bore axis to drill into. Pick an entry face on a different body, or verify the target body extends along the bore axis.
- `feature.created-ref.fallback-used` — *warning* (not error). The created-ref resolver fell back to a geometry-snapshot match after the topology lookup lost the face. The downstream feature still resolves. Lock the ref against future edits by naming the upstream feature with `.name()` and addressing it by `<name>.<slot>`.

(The same `feature.face-ref.*` codes apply to both edge features (`fillet`, `chamfer`) and face features (`shell`).)

### Created face refs

Subtractive features (`hole`, `cutout`) write created face refs that downstream
ops can address by `<featureName>.<slot>`:

```typescript
const plate = box(100, 60, 5)
  .hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'pilotHole' });

plate.fillet(0.2, { face: 'pilotHole.floor' });
```

Slots written by `hole`: `wall`, `floor`, `wall-back`, `counterbore-wall`,
`counterbore-floor`, `countersink-cone`, `entry-rim`, `floor-rim`,
`wall-back-rim`. Slots written by `cutout`: see `cutoutClassifier`.

When an upstream op rewrites enough topology that the slot-by-name lookup
loses the face, the resolver falls back to a geometry-snapshot match
(centroid + normal + area + surfaceType from the create-time fingerprint).
Successful fallback emits `feature.created-ref.fallback-used` (warning,
not error) — the downstream feature still resolves. Lock the ref against
future edits by naming the upstream feature with `.name()` and addressing
it by `<name>.<slot>`.

Per-primitive canonical face applicability:
- Box: all six (`top` / `bottom` / `left` / `right` / `front` / `back`).
- Cylinder: only `top` and `bottom` (the disc end-caps). Side faces have no canonical name.
- Sphere: none. Sphere with any `{ face }` filter → error.

## Face authoring — emboss & project

Two face-bound features add geometry onto an existing body's face. They author *into* the face's local (u, v) parametric space rather than into the world frame, so the result rides the body through downstream transforms.

Use them whenever a branded consumer product needs raised text, an engraved logo, or a label silhouette: eyewear temples with brand text, bottles with logos, appliance plates with model numbers. Flat-extruding glyphs in world coords reads as a toy — embossed/engraved text or a wrapped silhouette reads as a real product.

### `Shape.embossText({...})`

Raises or recesses text on a target face. Signed `depth` selects fuse vs cut:

```typescript
// Ray-Ban brand text raised 0.4 mm out of the temple's top face
const tempRayBan = box(130, 4, 2)
  .embossText({
    textContent: 'Ray-Ban',
    face: 'top',
    size: 2,
    depth: 0.4,           // > 0 ⇒ emboss out
    align: 'center',
    anchorU: 0.5, anchorV: 0.5,
  });

// CE compliance mark engraved 0.3 mm into the underside
const compliance = tempRayBan.embossText({
  textContent: 'CE',
  face: 'bottom',
  size: 1.2,
  depth: -0.3,            // < 0 ⇒ engrave in
  anchorU: 0.85, anchorV: 0.5,
});
```

| Field | Type | Notes |
|---|---|---|
| `textContent` | `string` | UTF-8, non-empty, non-whitespace. |
| `size` | `Editable<number>` | Glyph cap height in mm. |
| `depth` | `Editable<number>` | Signed mm. Positive = emboss out (fuse); negative = engrave in (cut). Zero rejected. |
| `face` | `FaceSelector \| string` | Canonical name (`'top'` etc.) or face label. |
| `align` | `'left' \| 'center' \| 'right'` | Default `'center'`. |
| `anchorU`, `anchorV` | `Editable<number>` | Face-local UV in `[0, 1]`. `0 = umin / vmin`, `0.5 = centre`, `1 = umax / vmax`. |
| `rotation` | `Editable<number>` | CCW degrees in the face tangent plane. |
| `scaleMode` | `'original' \| 'native' \| 'bounds'` | Default `'original'` (preserves mm size; planar faces only). |
| `fontFamily` | `string?` | Logical name or `.ttf` path. Default Liberation Sans. |

The emboss feature lowers via `replicad.drawText → drawing.sketchOnFace(face, scaleMode) → sketch.extrude(|depth|) → parent.fuse|.cut`. The fuse / cut runs through history-aware booleans (`fuseWithHistory` / `cutWithHistory`) so the newly-created glyph faces carry created-ref labels on the result `historyMap` and can be targeted downstream:

| `depth` sign | Label on planar glyph face | Label on side walls |
|---|---|---|
| `depth > 0` (emboss) | `embossed-text` | `embossed-text-wall` |
| `depth < 0` (engrave) | `engraved-text-floor` | `engraved-text-wall` |

Use these names to chain further features against the embossed/engraved geometry — for example `result.fillet(0.1, { face: 'embossed-text-wall' })` to round the glyph side walls on a raised brand mark.

### `Shape.projectCurve({...})`

Wraps a 2D closed curve onto a 3D face along the face normal. Returns a `Sketch` (face-bound) that composes with `.extrude(d)` to land a raised silhouette, or pair with the parent's `.subtract(...)` for an engraved logo:

```typescript
// Bottle body with a brand silhouette projected and raised on the top face.
// The source curve is expressed as a SketchCommand[] (the same wire format
// emitted by `path().moveTo(...).lineTo(...).close()`).
const mm = (n) => ({ expression: String(n), unit: 'mm', evaluated: n });
const logoCommands = [
  { kind: 'moveTo', x: mm(-8), y: mm(-5) },
  { kind: 'lineTo', x: mm( 8), y: mm(-5) },
  { kind: 'lineTo', x: mm( 8), y: mm( 5) },
  { kind: 'lineTo', x: mm(-8), y: mm( 5) },
  { kind: 'close' },
];
const bottle = cylinder(120, 30);
const raised = bottle
  .projectCurve({ source: { kind: 'sketchCommands', commands: logoCommands }, face: 'top' })
  .extrude(0.4);  // extrude along the face normal — raises the silhouette
const branded = bottle.union(raised);
```

| Field | Type | Notes |
|---|---|---|
| `source` | `ProjectCurveSource` | `{ kind: 'sketchCommands', commands }` or `{ kind: 'drawing', drawingJson }` (drawing-JSON branch is a follow-up). |
| `face` | `FaceSelector \| string` | Canonical / label. |
| `scaleMode` | `'original' \| 'native' \| 'bounds'` | Same as embossText. |
| `asEdge` | `boolean?` | **DEFERRED.** When `true`, the lowerer emits `feature.project-curve.no-intersection` — the bundled OCCT does not export `BRepProj_Projection`. Use closed-curve projection until the follow-up shim lands. |

### Recovery table

| Diagnostic code | What it means | Fix |
|---|---|---|
| `feature.emboss-text.depth-zero` | `depth === 0` rejected at capture. | Pass a non-zero `depth`: positive = emboss, negative = engrave. |
| `feature.emboss-text.face-too-small` | Glyph block exceeded the face bounds at wrap time. | Lower `size`, pick a larger face, or set `scaleMode: 'bounds'`. |
| `feature.emboss-text.boolean-noop` | The emboss/engrave boolean changed nothing — the glyph tool never intersected the body (anchored over a hole, off the face, or the wrong depth sign). | Move the anchor over solid material and check the `depth` sign (positive = emboss out, negative = engrave in). |
| `feature.project-curve.curve-empty` | `source.commands` had zero entries. | Build the path via `path().moveTo(...).lineTo(...).close().build()` so the wire has at least one segment. |
| `feature.project-curve.no-intersection` | Closed-curve case: the curve missed the face. Open-wire case (`asEdge:true`): deferred until OCCT bindings ship `BRepProj_Projection`. | Closed: clamp curve coords into the face bounds. Open: rewrite as a closed projection. |
| `feature.face.invalid-uv-anchor` | `anchorU` / `anchorV` outside `[0, 1]`. | Clamp the anchor to `[0, 1]`. |
| `sketch.text.empty-content` | `textContent` was empty or whitespace. | Pass a non-empty string with at least one printable glyph. |

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

## Naming features (slice 2)

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

## Query selectors

### Composed-query failure isolation

`kc.q.union(a, b, c)` is **strict by default**: if any sub-query raises (e.g. `query.unknown-label` because `c` references a label that does not exist on this scene), the composed query fails with `query.composition-strict-failure`, a single named wrapper that quotes the inner code for trace. Annotate with `.asLenient()` to allow partial success — failed sub-queries contribute zero entities, the surviving sub-queries are unioned, and execution continues.

```typescript
// Strict — throws query.composition-strict-failure if 'side-bevel' is not on this design.
const filletEdges = kc.q.union(
  kc.q.face(kc.q.withLabel('top')),
  kc.q.face(kc.q.withLabel('side-bevel')),   // may not exist
);

// Lenient — fillets what is present, skips what is not.
const filletEdgesLenient = kc.q.union(
  kc.q.face(kc.q.withLabel('top')),
  kc.q.face(kc.q.withLabel('side-bevel')),
).asLenient();
```

The same strict/lenient rule applies to `kc.q.intersection(...)` and `kc.q.subtraction(a, b)`.

### Runtime kind checks

`tsc --strict` rejects `kc.fillet({ edges: kc.q.face(...) })` at compile time because `kc.q.face(...)` returns `Query<FaceMarker>` and the `edges` slot expects `Query<EdgeMarker>`. The static check vanishes at JSON-AST / string-DSL boundaries — most notably the `evaluate_query` MCP tool's `query` input, where the phantom marker cannot survive `JSON.parse`. Consumers expecting a specific kind fall back to a runtime check that surfaces `query.type-mismatch` when the `Query.target` data field disagrees with the expected kind.

```typescript
// Compile-time: tsc rejects, kc.q.face(...) is Query<FaceMarker>, fillet wants edges.
kc.box(10).fillet({ edges: kc.q.face(kc.q.createdBy('arm')) });  // tsc error

// Runtime (JSON-AST input): the consumer's assertQueryKind(query, 'edge', 'fillet.edges')
// throws query.type-mismatch with a constructor-level repair:
// "use kc.q.edge(...) instead of kc.q.face(...)".
```

Queries built without a kind narrower (`kc.q.createdBy('arm')`, target `'any'`) are always accepted; they narrow downstream by the consumer's evaluator branch.

### Authoring sugar — `q` and `kc.q` inside a `.kcad.ts` script

The constructor namespace is reachable from any `.kcad.ts` source without an explicit `import`. Both forms work:

```typescript
// Top-level form — matches the api spread convention used by box(),
// cylinder(), assembly(), etc.
const lid = q.face(q.withFeatureName('case')).and(q.withLabel('lid'));

// Namespaced form — matches the SKILL.md prose voice and pairs with
// `kc.box(...)`.
const lid2 = kc.q.face(kc.q.withFeatureName('case')).and(kc.q.withLabel('lid'));
```

Both lines reach the identical constructor table and produce structurally equal `Query<FaceMarker>` values.

## Cookbook — Query DSL

Each snippet below ships as a runnable `.kcad.ts` file under `src/agent/skills/kernelcad-features/cookbook/snippets/`. The test `tests/integration/mcp/queryCookbookSmoke.test.ts` evaluates every snippet on every CI run; agents can paste these patterns into a model script and expect them to work end-to-end.

### Q-S1 — Construct and inspect a face Query

Build a `Query<FaceMarker>` lazily; the value carries the AST and the entity-kind narrower without resolving any topology. Use this whenever the same selector is reused across multiple consumers — author once, pass around as a value.

```typescript
const part = box(20, 20, 5, false, { faceLabels: { lid: 'top' } });
const lidQuery = q.face(q.withFeatureName('box1')).and(q.withLabel('lid'));

// Query<T> data fields are all serializable; chainable methods are
// non-enumerable so JSON.stringify round-trips cleanly.
JSON.stringify(lidQuery);   // { "_kind": "kc.query", "target": "face", "ast": {...} }
```

See `cookbook/snippets/Q-S1-construct-and-inspect-faces.kcad.ts`.

### Q-S2 — Set algebra on face Queries

`.and(...)`, `.or(...)`, and `.minus(...)` are the three composers. Each returns a fresh `Query<FaceMarker>` whose AST records the operation, so the originals stay reusable.

```typescript
const allFaces      = q.face().and(q.withFeatureName('box1'));
const floor         = q.face().and(q.withLabel('floor'));
const everythingBut = allFaces.minus(floor);                       // subtraction
const lidOrFloor    = q.face().and(q.withLabel('lid')).or(floor);  // union
```

See `cookbook/snippets/Q-S2-set-algebra.kcad.ts`.

### Q-S3 — Lenient composition for optional features

`.asLenient()` flips the Query into partial-success mode: sub-query failures (e.g. an undeclared label) contribute zero entities rather than tripping `query.composition-strict-failure`. Use this when the design family has optional features.

```typescript
const filletEdges = q.union(
  q.face(q.withLabel('lid')),
  q.face(q.withLabel('side-bevel')),    // may not exist on this design
).asLenient();
```

See `cookbook/snippets/Q-S3-lenient-composition.kcad.ts`.

## Verification gates

After applying edge/face features, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 — no `feature.invalid-args` or `feature.face-ref.*` diagnostics |
| G-face-ref-survives-transform | Apply features BEFORE final transforms when face-ref names matter. After translate/rotate, canonical face refs (top, bottom, etc.) still resolve, but inline queries may not |
| G-no-rim-island | Fillets / chamfers on subtractive boundaries (hole rims, pocket edges) reach a CONTINUOUS edge loop — no broken arcs or unfilleted segments in renders |
| G-shell-thickness-positive | Shell offset `t` is positive (outward) AND less than the smallest local feature radius — otherwise shells inverts or self-intersects |
| G-no-overlap | `kernelcad interference` reports zero overlaps; subtractive features (`hole`, `cutout`) clear their target volume completely |

## Related skills

- `kernelcad-authoring` — primitives and sketches that this skill operates on.
- `kernelcad-params` — bind feature dimensions (radius, depth) to editable parameters.
- `kernelcad-nurbs` — for freeform surfaces that fillet/chamfer cannot reach.
