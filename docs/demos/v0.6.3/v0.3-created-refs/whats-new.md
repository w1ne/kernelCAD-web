# v0.6.3 — v0.3 created-refs hero

## Hero artifact

cylindrical-wall-created-ref-through-fillet-chain — a 100×60×20 mm block with a 6 mm
through-hole whose bore wall is filleted *after* two unrelated fillet ops have
already rewritten the surrounding topology. The third fillet still lands on
`thruHole.wall` because every created face ref carries an immutable create-time
fingerprint (`snapshotAtCreate` + `surfaceType`) that survives the boolean and
edge-feature merges between the hole and the final fillet.

## Why memorable

- Recognizable in one second: a block with a rim-rounded through-hole and a softened bore — the visible roundness on the cylindrical wall is the new capability, not just another filleted box.
- New tool central: the build addresses the bore wall by its created face ref `thruHole.wall`. The resolver's new branch (topology route + geometry-snapshot fallback) is the only reason the third fillet succeeds; without it the slot lookup would lose the wall after the prior two fillet ops.
- Reads at 360°: under default poses, the rotation reveals (a) the filleted entry rim of the through-hole on top, (b) the softened outer top edges of the block, and (c) the filleted bore wall visible through the hole. All three fillet outputs are legible from every angle.

## What's new

v0.6.3 finishes the v0.3 stable-naming slice. Created face refs (`hole`, `cutout`)
now resolve end-to-end through the `HistoryMap` topology route, degrading to a
geometry-snapshot fallback (centroid + normal + area + surfaceType) when an upstream
op rewrites enough topology to lose the slot lookup. Successful fallback emits
`feature.created-ref.fallback-used` as a warning (not an error) so downstream
features continue without retry. `FaceLineage` gained two siblings — `snapshotAtCreate`
(immutable) and `surfaceType` — that ride through every downstream lowerer's merge.
The new MCP tool `get_face_lineage` walks the chain of lineage entries that produced
a named face ref, surfacing `chain` and `usedFallback` for an agent to inspect.

![Source](./source.kcad.ts)
