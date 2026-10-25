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

## Sequence planner (P1)

`sequence: true` treats the per-direction blocker sets as a **directional blocking graph** (`blockingGraph`: `part -> blocker -> direction`). The removal order is a deterministic topological peel of that graph; `sequence.steps` is its reverse, so each step's `direction` is the insertion direction (the reverse of the proven removal direction). Steps are 1-indexed and carry `adds`.

Every part has one of three states in `parts[].state`, and they are never collapsed:

- `{ kind: 'removable', direction, testedDirections }` — a straight removal was proven.
- `{ kind: 'blocked', blockersByDirection: [{ direction, blockers }] }` — blocked in every tested direction, with the blockers named.
- `{ kind: 'unknown', reason }` — not proven either way. Reasons are `budget`, `needs-multi-part-move` and `non-straight-path`.

Catalog screw, bolt, threaded-rod and nut families are detected as threaded fasteners. Pass `threadedFasteners: ['name']` to declare a hand-modeled fastener. Without declared motion a threaded fastener stays `unknown: non-straight-path`; it is never reported `blocked` or straight-removable. `blocked` and `unknown` never mean "impossible".

### Subassemblies

Clusters of parts joined by a `fastened` mate, or by a fixed `connect`/`connect:` placement, are subassembly candidates. The MCP verifier derives them automatically; the pure API accepts an explicit `subassemblies: [{ name, parts }]` list. A candidate is planned as one unit at the top level and its inside is planned recursively with the same planner:

- internal build steps come first and carry `Step.subassembly = '<name>'`;
- the install step follows them, adds the unit name (`adds: ['<name>']`) and carries the same `Step.subassembly`;
- the unit's own insertion direction is the reverse of the direction in which the assembled unit clears the parts outside it.

`heldBy` stays absent: no fixture or gravity model is guessed until P3.

### Choosing an order

Among valid removable entities the planner applies deterministic tie-breaks: subassemblies first, then outside-in (smallest clear travel), fewest reorientations (same direction as the previous step), fewest tool changes, then the part name. The same input therefore produces the same sequence. When no single entity is removable, a blocking-reduction partition tries bounded multi-part subsets; a verified subset becomes one `adds` entry that moves together. If the partition budget cannot decide, the remaining parts are `unknown: needs-multi-part-move`; a proven trap stays `blocked`.

### Fastener helical motion (P2)

Declare the motion on the `fastened` mate that joins the fastener to the assembly:

```ts
arm.mate('bolt-a', 'bolt-a.head-bearing', 'cover.bolt-a-seat', 'fastened', {
  fastener: {
    part: 'bolt-a',          // defaults to the one threaded endpoint, then side A
    axis: [0, 0, 1],         // removal/approach axis in the part's own frame
    pitchMm: 0.7,            // omit for a catalog fastener: ISO coarse pitch is read
    handedness: 'right',     // default
    threadLengthMm: 12,      // axial unthread distance before the free translation
    standard: 'ISO 4762',
    tool: { kind: 'cylinder', lengthMm: 30, diameterMm: 9, label: 'hex-key' },
  },
});
```

For a catalog fastener `pitchMm`, thread length, standard and a default per-family tool envelope can come from its `catalogPart` attributes. A hand-modeled fastener needs the metadata and an explicit `threadedFasteners` entry. The planner sweeps the part along the axis while sampling its rotation; a part whose perpendicular bounding box is unchanged by rotation is tested once. A clear path becomes a `removable` state with `motion: 'helical'` and a step carrying `motion: 'helical'` plus `fastener { axis, pitchMm, handedness, threadLengthMm, turns, standard? }`. Blockers are still named per axis. The rotation is recorded in the answer, not inferred as a hardware torque or thread fit.

### Tool reach (P2)

A `tool` envelope is swept from the fastener's outermost face outward along the same approach axis. `cylinder` uses `diameterMm`; `cone` uses `tipDiameterMm` at the fastener end and `diameterMm` at the outer end. The sweep runs against every other part in the planning level, so it is a conservative design finding. If any part obstructs the envelope, the step carries `tool { fastener, status: 'tool-blocked', blockers, tool }`, `sequence.toolBlocked` lists it, and `ok` is false. A clear envelope adds `toolReach: 'swept-envelope'` to the model stamp. No envelope means no tool claim: an unmodelled tool never invents a pass or a failure.

Tool reach also feeds the S2 requirements ledger through the assembly-path result: a modelled envelope adds `assembly.toolReach.<fastener>` with a real pass/fail and the blockers in its message. Press/snap fits add `assembly.requiresForce.<part>` as `not-evaluated` (declared, not simulated). The ledger is only present when the call produced such entries.

### Press and snap fits (P2)

A declared fit on the same fastened mate becomes a `requires-force` step:

```ts
arm.mate('input-shaft-gear-a', 'input-shaft.gear-a-seat', 'gear-a.shaft-mount', 'fastened', {
  fit: { kind: 'press', part: 'gear-a', axis: [0, 0, 1] },
});
```

The part's state is `requires-force`, the step carries `motion: 'requires-force'` and `requiresForce: { kind }`, and `sequence.requiresForce` lists it. The rigid planner never simulates insertion force, deformation or snap engagement: `ok` stays false and the S2 entry is `not-evaluated`.

### Sampling fallback

For a part that fails every tested straight direction, a deterministic RRT-style search tries a piecewise-linear translation path inside a strict node budget. A found path is listed in `sequence.search` as `{ part, status: 'found-by-search', waypoints }` and its part is added by the build sequence. This is **evidence inside a finite budget, never a proof**: it does not certify clearance, and `ok` stays false when any step is found by search. Exhausting the search budget is reported as `unknown: budget`, not `blocked`. Threaded fasteners are not searched; they remain `unknown: non-straight-path`.

Both the report and the sequence carry a model stamp: rigid parts, the straight-line translation along the tested directions plus every motion model actually used (`straight-line-translation`, `helical-screw`, `requires-force`, `sampling-search`), no gravity (P3 has not run), the triangle-mesh basis, the tessellation tolerance used to make the mesh, the zero-clearance policy and whether tool reach was modelled. A sequence is therefore only valid inside that stated model.

```json
{
  "check": "assembly-path",
  "file": "examples/assemblies/assembly-sequence-gearbox.kcad.ts",
  "sequence": true
}
```

The gearbox example declares two fastened clusters (each shaft with its two gears), four blockout bolts with helical mate metadata, a press-fit gear and a rib beside one bolt head. The result builds each cluster inside, installs it as one unit, adds the bolts and rib, and places the remaining posts, cover and base: 19 steps, no unknown parts. All four bolts are `motion: 'helical'`; the press-fit gear is a `requires-force` step; `sequence.toolBlocked` names `tool-clearance-rib` for `bolt-a`. The `subassembly-1-…` / `subassembly-2-…` names are derived deterministically from the cluster's first part name.

This is local validation of oriented, closed, manifold triangle meshes, not exact BREP or hardware acceptance. Curved surfaces inherit the export mesher's approximation. Positive-travel contact is conservatively blocked; starting contact can block sliding, although contact only at exactly zero travel while departing is allowed. Positive overlap is blocked even below 1e-9 mm of travel. Containment uses oriented solid-angle winding; numerically ambiguous classifications return an error rather than a clear result. Helical motion is a declared-axis sweep with sampled rotation, not thread engagement; tool reach is a swept envelope, not a driver drawing; fixtures, deformation, insertion force and hardware torque remain outside the check. The heuristic order is not exhaustive, subassembly detection is limited to fastened/fixed clusters plus a bounded partition, and the sampling fallback cannot prove a path or its clearance. Invalid geometry, missing/ambiguous assemblies, more than 128 parts, more than 64 extra directions, or more than eight million total work units return an error rather than a clear result; in sequence mode a work-budget stop is instead reported as `unknown: budget`. The shared budget covers mesh preprocessing and BVH construction, containment triangle visits, broad-phase node/triangle visits (including rejected bounds), helical orientation sweeps, tool envelopes and narrow-phase collision tests across the initial check and the entire disassembly/peel pass. Stationary triangles are queried through the existing BVH rather than scanned pairwise. Dense assemblies may need simplification or smaller subassemblies.
