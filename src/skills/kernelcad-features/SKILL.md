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
