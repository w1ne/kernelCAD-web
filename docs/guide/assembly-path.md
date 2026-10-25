# Check assembly removal paths

Use the MCP verifier to test whether assembly parts can leave along a straight line:

```json
{
  "check": "assembly-path",
  "file": "assembly.kcad.ts",
  "assembly": "my-assembly",
  "directions": [[1, 1, 0]],
  "disassemblyOrder": true,
  "sequence": true
}
```

`file` or inline `code` supplies the model. Select `assembly` when more than one assembly was lowered. `sequence: true` adds the planner result described below; without it the check keeps its per-part report. The six world-space directions ±X, ±Y and ±Z always participate. Additional `directions` are nonzero finite vectors, normalized and deduplicated. Supply a hole or fastener axis in world coordinates explicitly; automatic axis inference is not included.

Each entry in `parts` describes the **original assembly**: `part`, `removable`, `validDirections`, and `directions`. Each tested direction includes `direction`, `distanceMm`, `clear`, and `blockingParts`. Travel continues until the moving part's bounding box clears the assembly bounding box. A continuous triangle sweep checks the entire interval, so it does not skip an obstacle between sampled poses. A clear removal path also gives an insertion path by reversing the same translation with the other parts fixed.

With `disassemblyOrder: true`, the checker repeatedly removes the first freed part in assembly order and recomputes against the remaining parts. `removalOrder` contains `{part, direction}` steps; `stuckParts` contains what remains. This pass does not change `parts` or mutate the model. `ok` means every original part has a clear direction when the pass is off, or the pass removed every part when it is on. An order may succeed even when some initial parts are blocked. In `sequence` mode, `ok` means the peel ordered every part; blocked or unknown parts make it false without meaning "impossible".

## Sequence planner (P1 stage A)

`sequence: true` treats the per-direction blocker sets as a **directional blocking graph** (`blockingGraph`: `part -> blocker -> direction`). The removal order is a deterministic topological peel of that graph; `sequence.steps` is its reverse, so each step's `direction` is the insertion direction (the reverse of the proven removal direction). Steps are 1-indexed and carry `adds: [part]`. `sequence.unknown` lists parts whose state is `unknown`.

Every part has one of three states in `parts[].state`, and they are never collapsed:

- `{ kind: 'removable', direction, testedDirections }` — a straight removal was proven.
- `{ kind: 'blocked', blockersByDirection: [{ direction, blockers }] }` — blocked in every tested direction, with the blockers named.
- `{ kind: 'unknown', reason }` — not proven either way. Reasons are `budget`, `needs-multi-part-move` (reserved for stage B) and `non-straight-path`.

Catalog screw, bolt, threaded-rod and nut families are detected as threaded fasteners and reported `unknown: non-straight-path`; pass `threadedFasteners: ['name']` to declare a hand-modeled fastener. Stage A does not model the helical removal (P2 does), so a fastener is never reported `blocked` or straight-removable. A work-budget stop is reported as `unknown: budget`, not an error. `blocked` and `unknown` never mean "impossible".

Both the report and the sequence carry a model stamp: rigid parts, straight-line translation along the tested directions, no gravity (P3 has not run), the triangle-mesh basis, the tessellation tolerance used to make the mesh, and the zero-clearance policy. A sequence is therefore only valid inside that stated model.

```json
{
  "check": "assembly-path",
  "file": "examples/assemblies/assembly-sequence-gearbox.kcad.ts",
  "sequence": true
}
```

The twelve-part example produces a bottom-up build sequence (base, four posts, two shafts, four gears, cover) and no unknown parts. Stage B will add subassemblies, ordering heuristics and the non-straight-path search fallback; the `Step.subassembly`, `Step.heldBy`, `unknown.needs-multi-part-move` and `unknown.budget` fields are reserved for those additions.

This is local validation of oriented, closed, manifold triangle meshes, not exact BREP or hardware acceptance. Curved surfaces inherit the export mesher's approximation. Positive-travel contact is conservatively blocked; starting contact can block sliding, although contact only at exactly zero travel while departing is allowed. Positive overlap is blocked even below 1e-9 mm of travel. Containment uses oriented solid-angle winding; numerically ambiguous classifications return an error rather than a clear result. Rotations, mates, fixtures, tool access, deformation and unthreading are outside the check. The greedy pass does not search alternative paths or solve general assembly planning. Invalid geometry, missing/ambiguous assemblies, more than 128 parts, more than 64 extra directions, or more than two million total work units return an error rather than a clear result; in sequence mode a budget stop is instead reported as `unknown: budget`. The shared budget covers mesh preprocessing and BVH construction, containment triangle visits, broad-phase node/triangle visits (including rejected bounds), and narrow-phase collision tests across the initial check and the entire disassembly/peel pass. Stationary triangles are queried through the existing BVH rather than scanned pairwise. Dense assemblies may need simplification or smaller subassemblies.
