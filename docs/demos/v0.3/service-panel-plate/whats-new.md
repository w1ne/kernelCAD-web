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
