# v0.3 slice 1 — service-panel mounting plate

## Hero artifact

A 120 × 80 × 10 mm aluminum plate carrying every new v0.3 capability visibly:

- 4 M5 corner bolt holes (through, simple)
- 2 M6 counterbored mounting holes (cb Ø 11, depth 4)
- 1 M4 countersunk grounding screw hole (default 90° angle)
- 1 D-shaped cable cutout (through)

Built in a single chained agent call — see `solution.kcad.ts`. Total: ~25 lines including formatting.

## Why memorable

- **Every new method is visibly central.** `hole`, `holes`, and `cutout` each appear in the chain. Removing any one of them eliminates a feature on the artifact (corner bolts disappear, panel mounts disappear, ground stud disappears, or cable port disappears). It's not a generic plate-with-a-hole.
- **Every new opt key is visibly central.** `counterbore`, `countersink`, `'through'`, and the batched `positions` array all show up. Each maps to a recognizable geometric feature on the part.
- **It reads as a real engineered part.** A service-panel mounting plate is something an electrical or mechanical engineer would ship — mixed bore profiles for mixed fastener types, plus a cable pass-through. Auto-rotation video shows all four hole profiles from each azimuth.

## What's new

This slice adds three new methods on `Shape` plus their hard-coded created face refs:

```typescript
target.hole(face, opts) // single bore: counterbore | countersink | 'through' | upToFace
target.holes(face, opts) // batched bolt patterns; one feature record, one editable unit
target.cutout(profile, opts) // sketch-driven subtractive extrude for irregular shapes
```

Each emits named refs the agent can address downstream without queries:

| Ref | Emitted when |
|---|---|
| `wall` | always (cylindrical bore wall, or cutout side walls) |
| `floor` | blind only |
| `wall-back` | through (or `upToFace` set) |
| `counterbore-wall` | with `counterbore: {...}` |
| `counterbore-floor` | with `counterbore: {...}` |
| `countersink-cone` | with `countersink: {...}` |

Chained `.fillet({ face: 'wall' })` rounds every new bore lip in one call.

Slice 1 limitations (lifted in slice 2 / 3):
- Repeat `.hole()` collapses both walls under `'wall'`. Per-instance positional refs (`hole1.wall`) land in slice 2.
- Generalized created-refs subsystem and geometry-snapshot fallback are slice 2.
- Param lifecycle (user-parameter vs model-parameter) and unit inheritance are slice 3.

The v0.3.0 tag is **not** cut by this slice. Tag waits for slice 2 + slice 3.

## Slice 2 additions

The slice-2 PR generalizes the created-refs subsystem (no more central classifier file), adds a geometry-snapshot fallback for post-split lineage, and introduces agent-chosen feature names. The hero artifact's `solution.kcad.ts` is rewritten to use `name:` opts so the chained call reads as a documented build:

```typescript
return box(120, 80, 10)
  .holes('top', { positions: corners, diameter: 5, depth: 'through', name: 'cornerBolts' })
  .holes('top', { positions: panelMounts, diameter: 6, depth: 'through',
                  counterbore: { diameter: 11, depth: 4 }, name: 'panelMounts' })
  .hole('top',  { u: 50, v: 0, diameter: 4, depth: 'through',
                  countersink: { diameter: 8, angleDeg: 90 }, name: 'groundStud' })
  .cutout(panelCableProfile, { face: 'top', depth: 'through', name: 'cablePort' })
  .fillet(0.2, { face: 'cornerBolts.wall' })
  .fillet(0.3, { face: 'panelMounts.wall' });
```

Each `name:` lets a downstream `.fillet()` / `.shell()` address its bore wall individually (`cornerBolts.wall` vs `panelMounts.wall`). The collective `'wall'` selector still works for round-everything-in-one-call ergonomics.

Slice 2 also adds:
- Ordinal fallback `hole1.wall`, `hole2.wall`, `cutout1.wall` for chains that didn't bother to name (chain-order based; named features don't consume an ordinal slot).
- Geometry-snapshot fallback: when topology returns zero hits AND a snapshot reference exists, the resolver matches by centroid + normal + area within tolerance. Single-match → success; multi-match → `feature.face-ref.ambiguous-after-split`.
- Generalized propagator (`applyCreatedRefs` + `refreshSnapshots`): future feature kinds (boss, rib, sweep) add a lowerer + classifier file; no central switch.

Slice 2 preserves slice 1's behavior — every slice-1 test passes unchanged.

## Slice 3 additions

Slice 3 turns the same service-panel script into a parametric design. The top
of `solution.kcad.ts` now declares symbolic params for the plate dimensions,
fastener diameters, counterbore dimensions, countersink diameter, and optional
cable-port gate:

```typescript
const plateW = param('plateW', 120, { min: 80, max: 180 });
const cornerBoltDia = param('cornerBoltDia', 5, { min: 3, max: 8 });
const addCablePort = param('addCablePort', true);
```

Those refs flow directly into the chain:

```typescript
return box(plateW, plateD, plateT)
  .holes('top', { positions: corners, diameter: cornerBoltDia, depth: 'through', name: 'cornerBolts' })
  .cutout(panelCableProfile, { face: 'top', depth: 'through', name: 'cablePort', enabled: addCablePort });
```

After the first build, an agent can inspect the params and rewrite their
`param()` defaults in the source with MCP:

```typescript
inspect({ of: 'params' });
set_param({ code, param_name: 'cornerBoltDia', new_value: 6 });
set_param({ code, param_name: 'addCablePort', new_value: false });
```

Numeric edits re-lower the first affected feature and its downstream
dependents. Boolean edits can gate optional features off; downstream refs like
`cablePort.wall` become passthroughs and return a soft warning instead of
aborting the rebuild.

MP4 + panel.png recording is still deferred to a follow-up recording pass
before any v0.3.0 tag.
