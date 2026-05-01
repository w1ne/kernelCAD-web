## v0.13.0-rc.10 (NORTHSTAR roadmap: sketch loft + bundled rc.9 fixes) — 2026-05-01

### Added
- **`Sketch.loft(other, opts?)`** — loft a profile through one or more additional sections to produce a 3D solid that smoothly interpolates between them. Use for nozzles (round-to-square), wings/airfoils (varying-cross-section ribs), fairings, transition pieces, gear teeth varying along thickness. `other` accepts either a single `Sketch` or `Sketch[]` for N-section lofts.
- **Loft section positioning:** `opts.spacing: number` z-stacks axially (default 10 mm); `opts.planes: PlaneSpec[]` provides explicit per-section placement and takes precedence.
- **Loft surface options:** `opts.ruled: true` produces straight (faceted) transitions; `opts.startPoint` / `opts.endPoint` extend the loft past the first / last section to a single point.
- **`OcctBackend.loftFromSketches(sketches, planes, opts?)`** — backend factory using Replicad's `Sketch.loftWith(others, loftConfig)`. Frustum volume measured at exactly the analytic 280 mm³ for the canonical 2x2 → 4x4 frustum at h=30.
- **3 new diagnostic codes:** `feature.loft.empty-sections`, `feature.loft.invalid-planes`, `feature.loft.failed`. Each has a `whyDidThisFail` hint.
- E2E fixtures: `tests/e2e/fixtures/nozzle.kcad.ts` (circle-to-square loft), `tests/e2e/fixtures/airfoil.kcad.ts` (4-rib wing).
- `loft` advertised in `list_api`'s `sketchMethods`.

### Changed
- **`Shape.lower()` cache invalidates on transform-count change** in addition to record-count growth (rc.9 review C1 fix). The previous cache returned stale geometry after `Shape.translate/rotate/scale` because `appendTransform` mutates `record.transforms` in place without changing `records.length`. Agents calling `selectEdges` after a transform now get edges from the post-transform frame.
- **`EDGE_QUERY_KEYS` and `FACE_QUERY_KEYS`** now have a true compile-time exhaustiveness check via `Exclude<keyof T, typeof KEYS[number]> extends never` (rc.9 review I1 fix). Adding a key to `EdgeQuery`/`FaceQuery` without updating the array produces a TypeScript compile error. The runtime magic-number length test was dropped — TS catches the regression.
- New **`tests/integration/mcp/serverToolDispatch.test.ts`** enforces parity between `server.ts:TOOLS` and the call-handler switch (rc.9 review I2 fix). Source-text-parse comparison; same shape as the `list_api` drift sentinel that paid off in rc.9.
- **L-bend sweep bounding-box assertion** tightened from 2 loose checks (`max[0] > 28`, `max[2] > 28`) to a strict 6-bound assertion covering both `min` and `max` for x/y/z (rc.9 review I5 fix). The asymmetric rule was discovered empirically: profile half-width extends ±1 perpendicular to each leg's direction but NOT along rail-end tangent. Documented inline.

### Deferred to subsequent rcs
- Closed-rail sweep (torus-like) — rc.11
- 3D path builder (`path3d()`) — rc.11+ (or never; agents have `helix()` and raw polylines)
- Other rc.9 review items (I3 sweep-discriminator regression test, I4 multi-face guard for extrude/revolve, I6 RailPoint cleanup, all 5 rc.9 nits) — rc.11 quality pass
- Persistent topological IDs across booleans/transforms — v0.5+

---

## v0.13.0-rc.9 (NORTHSTAR roadmap: quality pass v2 — close all rc.8 review + rc.7 deferred) — 2026-05-01

### Added
- **`src/backends/occt/queryKeys.ts`** — single source of truth for `EDGE_QUERY_KEYS` / `FACE_QUERY_KEYS`. Imported by capture-side dispatch, lowerer-side validation, and MCP `list_api`. `keyof` type-level test catches drift.
- **`list_api` drift sentinel test** — verifies `GLOBALS.map(g => g.name)` matches `Object.keys(createApi(ctx))`; same for `SHAPE_METHODS` against `Shape.prototype` and `SKETCH_METHODS` / `PATH_BUILDER_METHODS`. The first run of this sentinel found 5 globals (`extrudeRect`, `extrudeCircle`, `extrudePolygon`, `extrudeRoundedRect`, `revolveRect`) that were public API but missing from `list_api` — agents now discover them.
- **3 new sweep diagnostic codes** split out from `feature.sweep.failed`:
  - `feature.sweep.multi-face-profile` — profile drawing produces multiple faces (forward-looking; activates when text/boolean-composed sketches land in rc.10+)
  - `feature.sweep.profile-too-large` — profile cross-section exceeds rail's tightest curvature radius
  - `feature.sweep.spine-self-intersection` — rail self-intersects when extruded
- Each new code has a `whyDidThisFail` hint with concrete recovery actions.
- Soft cap on `rail.length` (5000); over-cap emits `feature.sweep.invalid-rail` with a hint to reduce `pointsPerTurn`. Prevents runaway helix-resolution from silently consuming minutes of CPU.
- `Shape.lower()` lazy cache — repeated calls (common in scripts that use `selectEdges` multiple times) return the cached lowered backend instead of re-running `RecomputeEngine.run()`. Invalidated by record-count growth.
- `OcctBackend.liftSketchToFace` — private static helper that consolidates the `sketch._drawing.sketchOnPlane(plane).face().outerWire()` cast pattern + multi-face check.
- `helix()` `startAngle` parameter test (was an API-surface-without-regression-guard gap).
- Sweep bounding-box assertions on pipe + L-bend tests — catches the wrong-shape regression class where OCCT returns a valid-but-wrong solid.

### Changed
- `EDGE_QUERY_KEYS` / `FACE_QUERY_KEYS` no longer duplicated across 4 files; all consumers import from `queryKeys.ts`.
- `Vec3` is the canonical type alias for `[number, number, number]`. The duplicate in `edgeQueries.ts` re-exports from `intent/types`. `RailPoint` in `helix.ts` becomes a re-export of `Vec3`.
- `Sketch.sweep` rail parameter type: `[number, number, number][]` → `Vec3[]` (alias change; runtime identical).
- All 7 MCP tools that wrap `runScript` now set `errorCode` on the lowering-error path (was only on the `runScript` catch path in rc.7). Uniform structured-failure protocol regardless of where the failure occurred. The lowering-path failures use `diagnostics.find(d => d.featureId === targetId && d.severity === 'error')` to surface the error from the actual failing feature.
- `listFeatures` no longer silently returns `{ features: [] }` on script error; emits `error` and `errorCode` like its sibling tools. File-read failure and missing-input return paths also now use the structured shape.
- `feature.sweep.failed` is now a fallback code; the discriminator in the lowerer prefers the 3 specific codes above.
- `isKernelError` no longer accepts plain objects with structural `KernelError` shape — the cross-realm scenario it guarded doesn't exist in current code paths. Reintroduce when `KernelError` is exposed to the vm sandbox.

### Deferred to subsequent rcs
- Loft / closed-rail sweep / 3D path builder — rc.10 (the next geometric feature milestone)
- Persistent topological IDs across booleans / transforms — v0.5+
- Variable-radius fillet/chamfer per edge — rc.11+
- Custom sweep options (`auxiliarySpine`, `withContact`, transition modes) — rc.11+
- Removal of deprecated `feature.face-feature.label-not-resolvable` — rc.10 (one rc grace, scheduled)

---

## v0.13.0-rc.8 (NORTHSTAR roadmap: sketch sweep + bundled quality fixes) — 2026-05-01

### Added
- **`Sketch.sweep(rail, opts?)`** — sweep a closed profile along a 3D polyline rail. `opts.frenet: true` for helices and curved rails (profile rotates with tangent + curvature); default `false` for straight pipes and planar polyline rails (profile keeps fixed world-up vector). Returns a `Shape` (3D solid).
- **`helix({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? })`** — pure function returning a polyline approximation of a helix curve, ready to pass to `Sketch.sweep`. Default 32 points per turn; agents tune for tight threads.
- **`OcctBackend.sweepFromSketch(sketch, rail, opts?)`** — backend factory that lifts the profile sketch's drawing onto XY, assembles the rail polyline into a spine wire, and calls the kernel's generic sweep.
- **4 new diagnostic codes:** `feature.sweep.invalid-rail`, `feature.sweep.failed`, `feature.sweep.bad-sketch`, `feature.sweep.unsupported-profile`. Each has a `whyDidThisFail` hint.
- **`list_api` MCP tool** — advertises the script-runtime surface (globals, Shape methods, Sketch methods, PathBuilder methods, EdgeQuery/FaceQuery key sets) so agents can discover the API via MCP without reading source. Closes rc.7 review finding I-3. Total MCP surface: 12 → 13 tools.
- E2E fixtures `tests/e2e/fixtures/pipe.kcad.ts` (square-profile pipe) and `tests/e2e/fixtures/spring.kcad.ts` (helical spring with `frenet: true`).

### Changed
- **`pickFace` query-mismatch diagnostic namespace fixed** — was `feature.edge-feature.no-edges-match`, now `feature.face-feature.no-match`. Closes rc.7 review finding I-1. Agents pattern-matching `feature.face-feature.*` now correctly receive face-feature errors from `Shape.shell({face: query})` calls.
- New hint entry for `feature.face-feature.no-match`.

### Deferred to subsequent rcs
- Closed-rail sweep (torus-like) — rc.9
- Variable-profile loft — rc.9+ (separate feature kind)
- Custom sweep options (`auxiliarySpine`, `withContact`, transition modes) — rc.9+
- 3D path builder (`path3d()`) — rc.9 if needed
- Other rc.7 review findings (I-2 EDGE_QUERY_KEYS DRY, I-4 errorCode lowering path, I-5 listFeatures gap, I-6 perf, I-7 cross-realm) — rc.9 quality pass

---

## v0.13.0-rc.7 (NORTHSTAR roadmap: quality pass — close all rc.6 review findings) — 2026-05-01

### Added
- **`KernelError` class** — kernel throws now carry a structured `code` field that flows through the script-runtime exception path into `CompilerDiagnostic`s. `whyDidThisFail` registers hints that are now actually reachable.
- **`pickFace` query/label dispatch parity** — `Shape.shell({ face: { atZ: 5 } })` and `Shape.shell({ face: 'rim' })` work end-to-end. Type-vs-runtime mismatch closed.
- **`selectEdges` / `selectEdge` script-runtime globals** — agents can pre-select edges in `.kcad.ts` files and pass the result back to fillet/chamfer for compose / multi-step refinement.
- **`Shape.lower()` lazy accessor** — eagerly lowers a captured `Shape` for inspection, used internally by `selectEdges`.
- **Top-level await support in `.kcad.ts` scripts** — script body now wraps in an async IIFE, so agents can `await selectEdges(shape, ...)` at top level.
- **5 new diagnostic codes:** `feature.label.unknown-name`, `feature.label.no-upstream-sketch`, `feature.label.unsupported-base`, `feature.label.mixed-convexity` (split from the rc.6 lumped code), and `feature.edge-feature.invalid-query` for unknown EdgeQuery keys.
- **`FaceQuery.inPlane` implementation** — was silently ignored in rc.6.
- **`EdgeSegment.normalA` and `normalB` populated** — were typed `Vec3 | null` but always `null` in rc.6.
- **`EDGE_QUERY_KEYS` whitelist in `buildEdgeFeatureRef`** — replaces structural duck-typing; unknown keys surface a diagnostic at lowering time instead of silently passing through.
- E2E fixture `tests/e2e/fixtures/preselected-edges.kcad.ts` exercises the `selectEdges → fillet` round-trip.
- Chamfer + shell integration tests with EdgeQuery / FaceQuery (coverage symmetry with the existing fillet path).

### Changed
- `ResolvedInputs._allRecords` renamed to `ResolvedInputs.records` — drops the leading underscore.
- `pickEdges` and `pickFace` signatures now take a third `records` parameter — concurrency-safe, no module-level mutable state in the lowering pipeline.
- `feature.face-feature.label-not-resolvable` is deprecated; the hint message points to the new specific codes. Will be removed in rc.8.
- `EdgeQuery.near` JSDoc explicitly documents that it sorts (closest first) but does not filter.
- The `feature.edge-feature.face-ref-not-supported` and `feature.face-feature.face-ref-not-supported` hint messages updated — previously contained a stale "v0.2-alpha" reference.

### Deferred to subsequent rcs
- `coalesceEdges()` collinear merge (rc.8)
- Per-edge variable radius `fillet([{edge, r:1}, {edge, r:2}])` (rc.8)
- Labels on revolve (rc.8 — needs different probe strategy for axisymmetric faces)
- Persistent topological IDs across booleans / transforms (v0.5+)
- Set ops on edge / face selections (rc.8+)
- Removal of the deprecated `feature.face-feature.label-not-resolvable` code (rc.8)

---

## v0.13.0-rc.6 (NORTHSTAR roadmap: query-first edge/face selection) — 2026-05-01

### Added
- **Query-based edge/face selection** — `Shape.fillet(r, EdgeSelector)` / `Shape.chamfer(d, EdgeSelector)` / `Shape.shell(t, { face: FaceSelector })` accept inline `EdgeQuery` / `FaceQuery`, pre-selected `EdgeSegment` / `EdgeSegment[]`, or canonical face names (existing behavior preserved).
- **`EdgeQuery` keys:** `atZ`, `atX`, `atY`, `near`, `within`, `parallel`, `perpendicular`, `convex`, `concave`, `minAngle`, `maxAngle`, `ofCurveType`, `tolerance`, `angleTolerance`. Multiple keys are AND-combined.
- **`FaceQuery` keys:** `atZ`, `atX`, `atY`, `parallelTo`, `inPlane`, `ofSurfaceType`, `containsPoint`, `near`, `tolerance`.
- **`selectEdges(shape, query)` / `selectEdge(shape, query)`** — pre-select for compose / reuse. `selectEdge` throws when ambiguous (>1 match) or empty.
- **`PathBuilder.label(name)`** — tag the most recent segment so it can be referenced later as `{ face: 'name' }`. Resolution flows through the same query path under the hood — no duplicate codepath. Pick non-canonical names to avoid collision with canonical face dispatch.
- **3 new MCP tools** for agent shape introspection: `list_edges` (with optional EdgeQuery filter), `list_faces` (with optional FaceQuery filter), `list_face_labels` (sketch labels with chord endpoints). Total MCP surface: 9 → 12.
- **5 new diagnostic codes:** `feature.edge-feature.no-edges-match`, `feature.edge-feature.ambiguous-selection`, `feature.edge-feature.invalid-query`, `feature.path.label-without-segment`, `feature.path.duplicate-label`. Each has a `whyDidThisFail` hint.
- E2E fixture `tests/e2e/fixtures/tabbed-plate.kcad.ts` — labeled rectangular plate with fillet on a labeled side via `{ face: 'tab-side' }`.

### Changed
- `FaceRef` and `EdgeRef` unions widened with new variants: `query`, `label`, `segment`, `segments`. Existing `canonical` / `tracked` / `created` / `propagated` variants unchanged.
- `Shape.fillet/chamfer/shell` arg-2 type widened from canonical-face-string-only to `EdgeSelector` / `FaceSelector`. Calling `.fillet(2, { face: 'top' })` on a box still works (canonical fast-path preserved).
- `OcctLowerer` `pickEdges` now dispatches on the ref kind (`canonical` / `query` / `label` / `segment` / `segments`). Canonical resolution path is unchanged.
- `ResolvedInputs` gains an optional `_allRecords` field so the lowerer can resolve labels by walking the upstream sketch.

### Deferred to subsequent rcs
- `coalesceEdges()` — collinear-segment merge (rc.7)
- Per-edge variable radius `fillet([{edge, r:1}, {edge, r:2}])` — rc.7
- Labels on revolve (rc.7 — needs different probe strategy for axisymmetric faces)
- Persistent topological IDs across booleans / transforms — separate "named topology" problem (v0.5+)
- Set ops on edge/face selections — rc.7+
- Custom JS predicates `{ predicate: (e) => ... }` — agent-hostile, MCP can't introspect functions

---

## v0.13.0-rc.5 (NORTHSTAR roadmap: v0.4-rc arc vocabulary) — 2026-05-01

### Added
- **`PathBuilder.threePointsArc(x, y, midX, midY)`** — arc through 3 points (start = current position, mid = via, end = (x,y)). No prior tangent required.
- **`PathBuilder.sagittaArc(x, y, sagitta)`** — arc by chord + perpendicular bulge height. Sign chooses bulge side (positive = ccw).
- **`PathBuilder.bulgeArc(x, y, bulge)`** — arc by chord + DXF bulge factor (`tan(includedAngle/4)`). Sign chooses bulge side.
- **`PathBuilder.radiusArc(x, y, radius)`** — arc by chord + explicit radius. Always minor arc. Sign chooses bulge side. Validates `|radius| >= chord/2` and `chord > 0`.
- New `SketchCommand` variants: `threePointsArc`, `sagittaArc`, `bulgeArc`, `radiusArc`. Stored in sketch metadata.
- New diagnostic code: `feature.sketch.degenerate-arc` — fires when `radiusArc` has `|radius| < chord/2` or degenerate chord. Hint entry in `whyDidThisFail`.
- E2E fixtures: `tests/e2e/fixtures/gear-blank.kcad.ts` (4-arc circle via threePointsArc), `tests/e2e/fixtures/cam-profile.kcad.ts` (mixed lineTo + sagittaArc + radiusArc).

### Changed
- `OcctBackend.fromSketchCommands` now tracks `currentX`/`currentY` in its replay loop so `radiusArc` can compute chord length. Replicad's `BaseSketcher2d.pointer` is protected; this is the cleanest workaround.
- `OcctLowerer` `'sketch'` arm narrows caught errors starting with `radiusArc:` to the new `feature.sketch.degenerate-arc` code (was `feature.sketch.failed`).

### Deferred to subsequent rcs
- Beziers (`quadraticBezierTo`, `cubicBezierTo`, `bezierTo`) — rc.6
- `centerArc(center, end)` — center+end form
- Major-arc opt-in for `radiusArc` (use `threePointsArc` for now)
- Convenience variants (`vSagittaArc`, `hBulgeArc`, etc.)
- Elliptical arcs

---

## v0.13.0-rc.4 (NORTHSTAR roadmap: v0.4-rc sketch revolve) — 2026-04-30

### Added
- **`Sketch.revolve()`** — terminal `.revolve()` on the path builder produces a 360° solid of revolution around the Z axis. Profile coordinates are interpreted as `(radial-X, axial-Z)`. Mirrors `Sketch.extrude(d)` in API shape — no parameters required for the basic case.
- `OcctBackend.revolveFromSketch(sketch)` — static factory that lifts a sketch-tagged backend's drawing onto the XZ plane and revolves it around `[0, 0, 1]`.
- `OcctBackend.getSketchCommands()` — accessor for original `SketchCommand[]` on sketch-tagged backends. Used by the lowerer to validate revolve profiles before construction.
- New diagnostic codes: `feature.revolve.crosses-axis`, `feature.revolve.empty-profile`, `feature.revolve.failed`, `feature.revolve.bad-sketch`. Each has a hint entry in `whyDidThisFail`.
- E2E fixtures `tests/e2e/fixtures/washer.kcad.ts` and `tests/e2e/fixtures/mug-body.kcad.ts` — washer (rect profile) and tall mug body (tangentArc profile).

### Changed
- Lowerer's `revolve` arm now dispatches on `profileKind`. The pre-existing `'rect'` branch (`revolveRect`) is unchanged. New `'sketch'` branch validates `x >= 0` for all profile points and rejects empty profiles before calling Replicad.

### Deferred to subsequent rcs / v0.14
- Partial revolves (`{ angleDeg }`) — needs wedge-boolean implementation.
- Non-Z axis (`{ axis: 'X' | 'Y' | 'Z' | [x,y,z] }`) — needs plane derivation.
- Sweep along path (`Sketch.sweep(rail)`) — different feature kind.
- Sketch labels for downstream face references.

---

## v0.13.0-rc.3 (NORTHSTAR roadmap: v0.4-rc tangentArc) — 2026-04-30

### Added
- **`PathBuilder.tangentArc(x, y)`** — first curved 2D segment in the path builder. Continues tangent from the previous segment to the target point. Enables rounded corners, smooth gear-tooth profiles, and other curve-between-segment patterns. Mirrors Replicad's `tangentArcTo`.
- New `SketchCommand` variant `{ kind: 'tangentArc', x, y }`. Stored in sketch metadata alongside existing moveTo/lineTo/close.
- E2E fixture `tests/e2e/fixtures/rounded-l-bracket.kcad.ts` — L-bracket with a rounded inner corner via tangentArc.

### Changed
- `OcctBackend.fromSketchCommands` switch now handles tangentArc commands. Calling `tangentArc` as the first segment surfaces a `feature.sketch.failed` diagnostic (Replicad rejects with "You need a previous curve").

### Deferred to subsequent rcs / v0.14
- `threePointsArc(end, midpoint)` — explicit 3-point arc
- `sagittaArc` / `bulgeArc` — DXF-style arc specs
- `bezierTo` / `quadraticBezierTo` / `cubicBezierTo` — bezier curves
- `lineH` / `lineV` / `lineAngled` / `polarLine` — convenience line variants
- Path labels (`.label('name')`) — for downstream face references
- Sketch revolve / sweep
- Sketch constraints

---

## v0.13.0-rc.2 (NORTHSTAR roadmap: v0.4-rc sketch builder, lines-only) — 2026-04-30

### Added
- **Sketch builder**: `path()` returns a `PathBuilder`; chain `.moveTo(x,y).lineTo(x,y).close()` to get a `Sketch`; `Sketch.extrude(depth)` returns a `Shape`. First architectural step toward Phase 1 of the agent-first feature-parity roadmap. Mirrors ForgeCAD's `path()` API.
- New `Sketch` capture proxy alongside existing `Shape`. Sketch records are captured with `metadata.commands: SketchCommand[]` array.
- New OcctBackend factories: `fromSketchCommands(commands)` (returns a sketch-tagged backend with internal Drawing) and `extrudeFromSketch(sketch, depth)`.
- New lowerer cases: top-level `'sketch'` and `'extrude'` `profileKind === 'sketch'` arm.
- E2E fixture: `tests/e2e/fixtures/l-bracket.kcad.ts` — agent-friendly demo of path-based 2D construction.
- New diagnostic codes: `feature.sketch.bad-commands`, `feature.sketch.failed`, `feature.extrude.bad-sketch`.

### Changed
- `OcctBackend.kind` widened to include `'sketch'` alongside primitive kinds. Sketch-tagged instances cannot be transformed/booleaned directly — only consumed by `extrudeFromSketch`. Future architectural cleanup will split into Solid/Sketch/Curve subtypes.

### Deferred to v0.14+ (per the agent-first geometry roadmap)
- Arc support (`arcTo`, `tangentArc`, `lineH`, `lineV`, `lineAngled`)
- Path labels (`.label('name')` for downstream face references)
- `polygon(points)` and `roundedRect(w, h, r)` as Sketch-returning conveniences (currently flat `extrudePolygon` / `extrudeRoundedRect` remain as released API)
- Stroke (open polylines)
- Sketch revolve / sweep
- Sketch constraints (Phase 2 of the parity roadmap)

---

## v0.13.0-rc.1 (NORTHSTAR roadmap: v0.12 final remove_feature) — 2026-04-30

### Added
- **Third MCP write tool: `remove_feature`** — removes a single line from a `.kcad.ts` script by substring match. Side-effect-free; returns `new_code` + re-evaluated diagnostics.
  - Input: `{ code, match }`
  - Output: `{ ok, new_code?, diagnostics?, error? }`
  - Refuses to remove the `return` line (state-machine detects top-level return at brace depth 0)
  - Errors on 0 or >1 matches (agent must disambiguate)
- 11 new tests (7 primitive + 4 tool) + 1 integration spawn test

### Why string-match (not feature_id)
`FeatureRecord.scriptLocation` is declared but never populated; adding source-position tracking is a separate architectural piece. String match mirrors `set_param_value`'s `param_name` — agents already have a reliable identifier (the line they wrote). Once scriptLocation lands later, `feature_id` could be added as an alternative.

### Deferred to v0.14+
- `suppress_feature` — wraps a line in `// @suppress` annotation
- `feature_id` alternative for set/remove tools (requires scriptLocation)

---

## v0.13.0-beta.1 (NORTHSTAR roadmap: v0.4-beta extrudeRoundedRect) — 2026-04-30

### Added
- **`extrudeRoundedRect(width, height, radius, depth)`** — second arbitrary-2D-profile primitive after `extrudePolygon`. Auto-clamps `radius` to `min(width/2, height/2)` (with a tiny safety margin for Replicad's exact-half edge case). Zero radius behaves like a sharp rectangle.
- e2e fixture `tests/e2e/fixtures/rounded-plate.kcad.ts` + acceptance test.

### Changed
- `extrude` FeatureKind now accepts `profileKind: 'rounded-rect'` in addition to existing `'rect'` / `'circle'` / `'polygon'`.

### Deferred to v0.4-rc / v0.4 final
- `path()` builder for arbitrary 2D paths
- Full `Sketch` builder type
- Sketch revolve / sweep
- Open polylines (`.stroke(width)`)

## v0.13.0-alpha.1 (NORTHSTAR roadmap: v0.4-alpha extrudePolygon) — 2026-04-30

### Added
- **`extrudePolygon(points, depth)`** — first arbitrary-2D-profile primitive. Takes an array of `[x, y]` points in millimetres and an extrude depth. Auto-normalizes winding (CW input silently reversed to CCW). Closed by default. Minimum 3 points.
- New diagnostic codes: `feature.extrude.bad-points` (missing/invalid metadata.points), `feature.extrude.failed` (OCCT exception during extrusion).
- e2e fixture `tests/e2e/fixtures/triangle-extrusion.kcad.ts` + acceptance test.
- `FeatureSpec.metadata` propagated through `CaptureSession.register()` so feature-specific structured data (like polygon points) can be attached without widening the param shape.

### Changed
- `extrude` FeatureKind now accepts `profileKind: 'polygon'` in addition to existing `'rect'` and `'circle'`.
- Lowerer's `'extrude'` case refactored to extract `height` per-profile-arm rather than unconditionally — fixed a latent bug where polygon records (which have no `height` param) would have crashed before reaching the polygon arm.

### Deferred to v0.4-beta+
- Sketch builder pattern (`sketch.polygon().extrude()`, `sketch.path().lineTo().close()`)
- `roundedRect` and `circle2d` as Sketch primitives
- Open polylines (`.stroke(width)`)
- Sketch revolve / sweep
- Self-intersection validation

---

## v0.12.0-rc.1 — 2026-04-30

### Added
- **Second MCP write tool: `add_feature`** — inserts a single-statement line into a `.kcad.ts` script before the last top-level `return`. Side-effect-free; caller persists via standard file tools.
  - Input: `{ code, feature_code }`
  - Output: `{ ok, new_code?, diagnostics?, error? }`
  - Implementation: state-machine that finds the last brace-depth-0 `return` line (skips inner returns in helper functions / arrow bodies), preserves indentation, respects strings/comments
- 11 new tests (7 primitive + 3 tool + 1 integration spawn)
- Live verification: spawned `kernelcad mcp`, sent JSON-RPC `tools/call` for `set_param_value`, confirmed the round-trip works end-to-end as Claude would consume it

### Deferred to v0.12.0 (final) / v0.13+
- `remove_feature(code, feature_id)` — needs `FeatureRecord.scriptLocation` to be populated by the capture session (currently declared but never set)
- `suppress_feature(code, feature_id)` — same scriptLocation requirement, plus capture-time `// @suppress` annotation parsing or `.suppress()` modifier method on the Shape proxy

The decision to ship just `add_feature` (without remove/suppress) is driven by the scriptLocation gap — adding source-position tracking to capture is its own architectural change worth a separate plan. v0.12.0 final would land after that work or after additional agent feedback.

---

## v0.12.0-beta.1 — 2026-04-30

### Added
- **First MCP write tool: `set_param_value`** — edits a `param()` default value in `.kcad.ts` source and returns the modified code plus diagnostics from re-evaluating the result. Side-effect-free; caller persists via standard file tools.
  - Input: `{ code, param_name, new_value }`
  - Output: `{ ok, new_code?, diagnostics?, error? }`
  - Implementation: regex-state-machine in `src/mcp/edits/setParamValue.ts` (handles single/double quotes, optional opts, nested braces in option objects, multi-line calls, multiple-match rejection)
- 14 new unit tests + 1 spawn integration test (10 primitive cases + 4 tool cases + 1 spawn round-trip)

### Changed
- None — additive only.

### Deferred to v0.12-rc / v0.12.0
- `add_feature(code, code_to_insert, position?)` — needs ts-morph or careful AST walker
- `remove_feature(code, feature_id)` — needs `FeatureRecord.scriptLocation` to map IDs to source lines
- `suppress_feature(code, feature_id)` — wrap a line in `// @suppress` annotation

The decision to ship just `set_param_value` for v0.12-beta is deliberate YAGNI — `param()` value tweaks are by far the most common agent edit, and adding more tools should be driven by usage rather than speculation. ForgeCAD has no AST-edit MCP equivalent, so this is novel kernelCAD territory.

---

## v0.12.0-alpha.1 — 2026-04-30

### Added
- **Skill installer** — second agent-first surface (companion to v0.11's MCP server)
  - `kernelcad skill install [--dir <path>]` — copies SKILL.md to `<dir>/SKILL.md` (default `~/.agents/skills/kernelcad/`, the joint convention all agents read from per ForgeCAD's pattern at `~/projects/forgecad-pkg/src-recovered/cli/forge-skill.ts`)
  - `kernelcad skill one-file [<path>]` — emits SKILL.md to a user-specified path (default `./kernelcad-context.md`) for chat-UI agents
- `src/skill/SKILL.md` (213 lines) — single-file kernelCAD model authoring guide. Hand-authored against the actual codebase (subagent caught and corrected 7 factual errors in the original plan):
  - API surface (param/box/cylinder/sphere/extrudeRect/extrudeCircle/revolveRect + Shape methods)
  - Canonical face refs constraint with workarounds
  - 3 sample scripts (parametric bracket, rounded bracket, hollow box)
  - 26-entry diagnostic codes table (synced with `whyDidThisFail`'s HINTS)
  - CLI commands + MCP companion tool reference
  - Out-of-scope deferred-features list
- Spawn integration test that drives the built CLI's `skill install` subcommand end-to-end

### Changed
- `build:cli` now copies `src/skill/SKILL.md` to `dist/cli/SKILL.md` so the runtime can find it (alongside `index.js` and `replicad_single.wasm`)
- Bundle banner: replaced `fileURLToPath` import (which collided with the same import in `src/cli/commands/skill.ts`) with inline `new URL(import.meta.url).pathname` / `new URL('.', import.meta.url).pathname`

### Deferred to v0.12-beta+ / v0.13+
- Auto-generated SKILL.md from `src/intent/types.ts` and the actual exported API surface (so the skill stays in sync with code automatically)
- AST-edit MCP tools (`replace_param_value`, `add_feature`, `remove_feature`)
- `--dev` flag for SKILL-dev.md (internals + conventions docs) — mirrors ForgeCAD's pattern
- `Shape.mirror()` method exposure (currently only on `OcctBackend`, not the user-facing capture proxy)

---

## v0.11.0 — 2026-04-30

### Added
- **3 new MCP topology tools** completing the v0.11 read-tools surface:
  - `list_topology(file?, code?, feature_id?)` — canonical face names + edge count for an introspected feature. Returns empty face list and `hasTrackedTopology: false` for non-primitives.
  - `get_edges_of(file?, code?, feature_id?, face_name)` — boundary edges of a named canonical face. Mirrors ForgeCAD's `edgesOf()`. Returns `[{ index, centroid, length, isClosed }]`. Centroid uses Replicad's parametric `pointAt(0.5)` so it's correct for arcs/circles, not just straight edges.
  - `why_did_this_fail(file?, code?, feature_id?)` — focused diagnostic view + upstream chain walk + **human-readable hints lookup** (26 entries covering known kernel diagnostic codes — fillet/chamfer/shell failures, face-ref errors, recompute cascade, CLI errors). Improvement over ForgeCAD's pattern, which has no equivalent — ForgeCAD agents read SKILL.md to interpret codes, kernelCAD's MCP returns the suggestion directly.
- 3 new spawn integration tests covering the new tools (5 total: 2 from alpha + 3 from final).

### Changed
- v0.11 milestone closed at final (no separate `-beta` tag in the public history). Version progresses 0.11.0-alpha.1 → 0.11.0.

### Deferred to v0.12+
- AST-edit tools (deferred per NORTHSTAR roadmap)
- Geometric edge selection (`select_edges` mirroring ForgeCAD's `selectEdges` for non-primitive shapes)
- HTTP transport (currently stdio-only)
- Skill installer (`forgecad skill install` equivalent)

## v0.11.0-alpha.1 — 2026-04-30

### Added
- **MCP server** — first agent-first surface (`kernelcad mcp` subcommand, stdio transport)
  - `evaluate_script(file? | code?)` — run a script, report pass/fail + feature count + diagnostics
  - `list_features(file? | code?)` — list captured features (kind, id, params, inputs, transform count, suppression)
  - `get_shape_info(file?, code?, feature_id?)` — volume / surfaceArea / bbox for the resolved feature (defaults to last)
- `@modelcontextprotocol/sdk` v1.29 dependency
- `src/mcp/` module with three pure tool functions reusable outside the MCP transport
- `tests/integration/mcp/spawn.test.ts` — subprocess + JSON-RPC integration test covering both initialize and tools/call

### Changed
- `EvaluateInput` (in `src/cli/commands/evaluate.ts`) widened to accept `{ code?: string }` for inline source. Existing `kernelcad evaluate <file>` surface unchanged.
- `vitest.config.ts` — `tests/integration/**` added to include path

### Deferred to v0.11-beta+ / v0.12
- `get_edges_of(feature_id)`, `get_faces_of(feature_id)` — topology query tools
- `why_did_this_fail(feature_id)` — guided diagnostic explainer
- AST-edit tools (deferred to v0.12 per NORTHSTAR)
- HTTP transport
- Skill installer (v0.12) — deliver kernelCAD docs as Claude Code / Codex skills

---

## v0.2.0-alpha.2 — 2026-04-30

### Added
- **`shell`** — third edge/face feature in v0.2-alpha (`Shape.shell(thickness, { face })`)
  - Required `face` input (no all-faces default); canonical face only on un-transformed primitives
  - Wraps OCCT's `BRepOffsetAPI_MakeThickSolid` via Replicad's `Shape3D.shell(thickness, finder)`
  - Diagnostic codes: `feature.shell.failed`, `feature.shell.no-base`, `feature.shell.no-thickness`, `feature.face-feature.face-required`, `feature.face-feature.face-ref-not-resolvable`, `feature.face-feature.face-ref-not-supported`, `feature.face-feature.face-ref-not-applicable`
- `pickFace(record, base)` helper in `edgeSelection.ts` — sister of `pickEdges`, returns the canonical face directly for face-features
- `findCanonicalFace` private helper extracted from prior `canonicalBoxFaceEdges` / `canonicalCylinderEndCapEdges`; both pickEdges and pickFace now share the resolution logic
- `OcctBackend.shell(face, thickness)` instance method
- `OcctLowerer 'shell'` switch case
- `Shape.shell` capture proxy (delegates to `CaptureSession.edgeFeature('shell', ...)`)
- `tests/e2e/fixtures/hollow-box.kcad.ts` fixture + e2e volume-regression test (shelled volume < 30% of solid equivalent)

### Changed
- `CaptureSession.edgeFeature()` widened to accept `kind: 'fillet' | 'chamfer' | 'shell'` and `valueParamName: 'radius' | 'distance' | 'thickness'`. No call-site changes for fillet/chamfer.

### Deferred to v0.3+
- `hole` as a distinct feature (v0.1 already supports `subtract(cylinder)` which covers the geometry; ergonomic wrapper deferred)
- `cut` as a distinct feature (v0.1 `subtract` already covers it)
- `draft` (face angle modification) — also a face-feature; same canonical-refs limitation
- Tracked refs / `NamingHistory`
- Non-canonical face filters

---

## v0.2.0-alpha.1 — 2026-04-30

### Added
- **`fillet` and `chamfer`** — first edge features in the kernelCAD module API
  - `Shape.fillet(radius, opts?)` and `Shape.chamfer(distance, opts?)` on the capture proxy (`src/capture/proxy.ts`)
  - Canonical face filter via `opts.face` (`'top'|'bottom'|'left'|'right'|'front'|'back'`) on un-transformed primitives — `box(20,20,5).fillet(2, { face: 'top' })`
  - Symmetric (45°) chamfer only; asymmetric two-distance variant deferred
- `pickEdges(record, base)` helper (`src/backends/occt/edgeSelection.ts`) — resolves face filter to OCCT edges via gap-aware bounding-box face matching
- `OcctBackend` `kind?` tag set by static factories; transforms and booleans drop the tag — used to enforce "canonical face refs require an un-transformed primitive"
- `OcctBackend.fillet(edges, radius)` / `.chamfer(edges, distance)` instance methods wrapping `BRepFilletAPI_MakeFillet` / `BRepFilletAPI_MakeChamfer`
- `OcctLowerer` switch arms for `'fillet'` and `'chamfer'` with structured diagnostics (`feature.fillet.failed`, `feature.chamfer.failed`, `feature.edge-feature.face-ref-not-resolvable`, `feature.edge-feature.face-ref-not-applicable`, `feature.edge-feature.face-ref-not-supported`)
- `CaptureSession.edgeFeature(kind, base, valueParamName, value, face?)` registrar mirroring the `boolean()` pattern
- `tests/e2e/fixtures/rounded-bracket.kcad.ts` parametric demo + e2e volume-regression test

### Spec deviations
- One combined error code `feature.edge-feature.face-ref-not-resolvable` covers both "non-primitive base" and "transformed primitive" cases. Splitting them cleanly would require refactoring `FeatureLowerer.lower()` to receive the base FeatureRecord — bigger blast radius than v0.2-alpha warrants.

### Deferred to v0.2 / v0.2-beta
- `tracked` / `created` / `propagated` FaceRef variants and `NamingHistory` walking
- Asymmetric (two-distance) chamfer
- Per-edge variable radii
- Canonical face refs on transformed primitives
- shell, hole, cut, draft features

## v0.1.0 — 2026-04-29

### Added
- New flat feature-graph IR (`src/intent/`)
- Runtime feature capture (`src/capture/`) — script-primary, no AST walk
- `ParamRegistry` with mathjs expressions, units, cycle detection (`src/compute/paramRegistry.ts`)
- `DependencyGraph` with topo sort + canReorder validation (`src/compute/dependencyGraph.ts`)
- `RecomputeEngine` with input-resolution and health states (`src/compute/recomputeEngine.ts`)
- `ShapeBackend` + `FeatureLowerer` interfaces (`src/backends/backend.ts`)
- `OcctBackend` + `OcctLowerer` for box/cylinder/sphere/extrude/revolve/boolean (`src/backends/occt/`)
- TypeScript script transpile + `vm`-based execution isolation (`src/script-runtime/`)
- `kernelcad` CLI: `evaluate` + `export stl|step` (`src/cli/`, esbuild bundle)
- v0.1 acceptance demo: parametric plate with hole

### Changed
- Version reset 0.10.0 → 0.1.0 per NORTHSTAR roadmap (new architecture line)
- Moved `src/lib/worker.ts` → `src/backends/occt/worker.ts`

### Deferred to v0.2+
- Edge features (fillet, chamfer, shell, hole, cut, draft) — require stable naming
- 2D sketch primitives + `tracked`/`created`/`propagated` topology refs
- `NamingHistory` walking + geometry-snapshot fallback

### Documentation
- New NORTHSTAR architecture spec (`docs/superpowers/specs/2026-04-29-kernelcad-NORTHSTAR.md`)
- Ported internal docs from `kernelCAD-private` into `docs/internals/`
- Added clean-room IP boundary clause to `CONTRIBUTING.md`
- Archived 22 obsolete docs to `archive/doc/`

---

# 🚀 kernelCAD v0.10.0

**Modern Programmable CAD for the Web**

---

## 📋 What's New

- chore: cleanup test artifacts (de01ddf)
- chore: ignore test results (11f4197)
- chore(release): prepare version for automation (a7ec6a3)
- chore(release): resolve build errors and test regressions (d423c72)
- chore(release): fix lint errors and improve type safety (47b96f6)
- chore(release): synchronize version and apply stabilization fixes (7b3d4ba)
- docs: update CHANGELOG for v0.10.0 (1ce0ea6)
- feat: add E2E test suite, release automation, and documentation improvements (337680c)
- feat: expand E2E test coverage and improve sketching reliability (91b0fc3)
- feat: fix sketch visibility, harden worker, and expand E2E test coverage (a32c71c)
- test: add standard workflow validation suite (2ca0540)
- feat: complete v0.6.1 architecture refactor and regression suite (dc6d3f7)
- Refactor: Implement Sketch on Face and Extrude Direction (37ead84)
- fix: resolve correct variable names in Extrude Face feature (4aa8cb8)
- fix: add plane validation to prevent invalid face sketching (70c2979)
- fix: prevent duplicate variable names in face sketch workflow (259acb2)
- refactor: Phase 2 - Extract face selection into custom hook (c23c71f)
- chore: enforce Node.js 22+ requirement (cf7ebc7)
- refactor: Phase 1 - Add plane utilities and constants (f16817f)
- feat: implement sketch visualization and complete phase 1.1 milestones (dc45a38)
- docs: add development experience and testing techniques to roadmap (b95bb10)
- feat: implement Face Selection and Extrude from Face workflows (b03a437)
- feat: implement Revolve, Fillet/Chamfer enhancements, and Boolean operations with full test coverage (7ed7c85)
- docs: restructure roadmap to prioritize professional CAD workflows (97332c1)
- feat(workflow): implement decoupled sketch-extrude workflow and standalone construction tools (e1f12b3)
- fix: resolve Sketcher.extrude error and implement circle tool support (9707001)
- test: fix SceneBrowser tests for new folder-based UI and mandatory props (d090643)
- feat: advanced plane infrastructure & scene browser evolution (e22a316)
- feat: refined sketching system v0.5.0 (07dfc1e)
- fix: extrude dialog number input validation (c4a0d80)
- feat: complete sketch → code → extrude workflow (4182aa7)
- feat: implement 2D sketch canvas with drawing tools (45a350f)
- feat: verify Replicad Sketcher API in browser (e0f139c)
- feat: add sketch mode infrastructure for v0.5.0 (34afc28)
- docs: reprioritize v0.5.0 as Sketching System (8ac0a00)
- docs: fix semantic versioning in roadmap (8d00b26)
- docs: clean up roadmap - mark v0.4.0 complete, reorganize phases (6801ebc)
- docs: add Feature History/Timeline phase to roadmap (9c1c30c)

---

## ✅ Test Results (Automated)

- **QC Check**: Passed (Linting & Build)
- **Unit Tests**: Ran successfully
- **E2E Tests**: Manual verification recommended

---

## 📦 Build Information

- **Version**: 0.10.0
- **Build Date**: 2026-02-04 14:54:08 UTC
- **Platform**: Web / linux

## 🎯 Supported Features

kernelCAD v0.10.0 supports:

| Feature | Description | Status |
|---------|-------------|--------|
| Sketcher | 2D constraint solver | Stable |
| Extrude | 3D extrusion from faces | Stable |
| Fillet/Chamfer | Edge modifications | Beta |
| STEP Export | CNC/CAM compatibility | Stable |

---

## 📥 Installation

### Use Online
Visit [kernelcad.com](https://kernelcad.com).

### Run Locally

```bash
git clone https://github.com/w1ne/kernelCAD.git
cd kernelCAD
git checkout v0.10.0
npm install
npm run dev
```

---

## 🐛 Report Issues
Found a bug? [Open an issue](https://github.com/w1ne/kernelCAD/issues)


# Changelog

All notable changes to this project will be documented in this file.
 
## [Unreleased]
### Added - Visibility & Selection System
- **Visibility Persistence**:
    - Implemented `localStorage` persistence for `hiddenIds`.
    - Hiding objects in Scene Browser (via Eye icon) is now preserved across page reloads.
- **Universal Selection**:
    - **Plane Selection**: Made all plane types (Base, Offset, Face-derived) selectable in the 3D Viewer.
    - **Visual Feedback**: Clicking a plane highlights it with `selection-blue`.
    - **Synchronization**: Selection state stays in sync between 3D Viewer and Scene Browser.
- **Testing Infrastructure**:
    - Enhanced `WorkbenchContext` to expose `setCode`, `startFaceSelection` and selection helpers to `window` for robust E2E testing.
    - Added `tests/visibility_selection.spec.ts` to verify persistence and interaction flows.

## [0.10.0] - 2026-02-04
### Added - Release Automation & Testing Infrastructure
- **Release Automation**:
    - Created `scripts/release.ts` for automated version bumping, tagging, and release note generation.
    - Integrated release script with `npm run release -- [major|minor|patch]` command.
    - Automated CHANGELOG updates and git tag creation.
- **Comprehensive E2E Test Suite**:
    - Added `tests/core_workflows.spec.ts` covering Box, Cylinder, Extrude, Revolve, Fillet, and Boolean operations.
    - Added `tests/error_handling.spec.ts` for edge case validation and error recovery.
    - Added `tests/extrude_face_anonymous_shape.spec.ts` and `tests/extrude_from_code_sketch.spec.ts`.
    - Improved Playwright configuration for better test stability and parallelization.
- **Custom Icon System**:
    - Created `src/icons/cad.ts` with custom CAD-specific icons.
    - Added `src/components/CustomIcons.tsx` for icon component library.
- **Integration Test Suite**:
    - Added `src/integration/e2e_workflows.test.ts` for workflow validation.
    - Added `src/integration/ui_workflows.test.tsx` for UI interaction testing.

### Changed
- **Documentation**:
    - Updated `RELEASE_STRATEGY.md` with Git Flow branching model and branch protection rules.
    - Added comprehensive release note template matching professional standards.
    - Enhanced `TESTING_STRATEGY.md` with detailed testing approach and coverage goals.
    - Updated `INTERFACES.md` with improved API documentation.
- **Worker Improvements**:
    - Refactored geometry worker for better error handling and reliability.
    - Improved memory management and buffer transfers.
    - Enhanced sketch processing and validation.
- **Type System**:
    - Added `src/types/editor.ts`, `src/types/replicad-opencascadejs.d.ts`, and `src/types/window-globals.d.ts`.
    - Improved type safety across the codebase.

### Fixed
- **Build Configuration**:
    - Updated `vite.config.ts` for better build performance.
    - Enhanced `tsconfig.app.json` with stricter type checking.
- **Test Stability**:
    - Removed flaky test artifacts and improved test isolation.
    - Fixed empty sketch validation tests.

### Technical
- **Code Quality**: Added ESLint rules for better code organization.
- **Dependencies**: Updated package-lock.json with latest compatible versions.
- **Cleanup**: Removed obsolete files (`scripts/release.sh`, `public/opencascade.wasm`).

## [0.9.0] - 2026-02-01
### Fixed - Critical Sketch Bugs
- **Empty Sketch Extrusion Crash**:
    - System now detects empty sketches (no geometry drawn) and throws a descriptive error instead of crashing with "No lines to convert into a wire".
    - Implemented `_hasGeometry` tracking in `SafeSketcher` via Proxy pattern to intercept drawing commands.
    - Updated `extrude` helper in `geometryHelpers.ts` to provide user-friendly error messages.
    - Added comprehensive unit tests in `tests/reproduce_empty_sketch.test.ts`.
- **Anonymous Shape Sketching Bug**:
    - Fixed AST parser incorrectly resolving chained expressions (e.g., `box.cut(tool)`) to base variables (`box`).
    - This caused sketches to attach to the wrong parent shape, leading to visual/parametric mismatches and empty sketch generation.
    - Implemented strict `resolveVariableName` in `src/lib/ast.ts` to only resolve direct identifiers.
    - System now generates safe "detached sketches" (`new Sketcher(plane)`) for anonymous shapes, ensuring correct global coordinates.
- **Sketch Code Generation Split**:
    - Resolved issue where sketch entities were generated in separate code blocks instead of being combined into the parent `sketchOnFace` call.

### Changed
- **SafeSketcher Proxy**: Enhanced method chaining to correctly return proxy instance for all drawing operations.
- **AST Resolution**: Removed recursive variable resolution for `CallExpression` and `MemberExpression` to prevent false parent identification.

### Technical
- **Tests**: +6 new unit tests for empty sketch handling and AST resolution.
- **Architecture**: Improved reliability layer defensive programming patterns.

## [0.8.0] - 2026-01-31
### Added - Sketch Visibility & Test Expansion
- **Sketch Visibility**:
    - Connected `sketchesGeometries` to the `Viewer` for real-time visualization.
    - Standardized `THREE.Line` rendering for continuous polylines.
    - Automatic conversion of single return values to arrays in AST when sketches are added.
- **E2E Test Coverage**:
    - 10 new Playwright tests covering Primitives (Box, Cylinder), Booleans (Union, Cut), Exports (STEP, STL), and UI interactions (Undo/Redo, View Modes).
    - Exposed `window.isEditorReady` and `window.getSketches` for test synchronization and validation.
- **Worker Robustness**:
    - Ultra-robust error handling in geometry worker via multiple try-catch layers.
    - Graceful handling of invalid/zero-length geometry without engine crashes.
    - Vertex-based sketch deduplication to prevent redundant rendering.
 
### Fixed
- **UI Stability**:
    - Resolved a null-pointer crash during `sketchOnFace` initialization in `WorkbenchLayout`.
    - Implemented zero-length entity filtering in `SketchCanvas` to prevent invalid Replicad inputs.
- **E2E Regression**:
    - Updated stress tests to use proper drag motions and verify visual geometry presence.
 
## [0.7.0] - 2026-01-30
### Added - Reliability & Testing Overhaul
- **Comprehensive Fuzzing Suite**: Property-based testing using `fast-check` to validate geometry kernels against edge cases (`NaN`, infinite inputs, disjoint unions).
- **Workflow Validation Framework**: Automated regression testing for complete end-to-end user workflows (`src/workflows`).
- **Testing Strategy Documentation**: detailed guide in `doc/TESTING_STRATEGY.md`.

### Changed
- **Robustness**:
    - **Logic**: Enforced disjoint inputs for Boolean Union to prevent kernel crashes in headless mode.
    - **Validation**: Strict validation of operations (Fillet, Chamfer) with fallback checks for missing properties.
- **Architecture**:
    - **Linting**: Added architectural boundaries to prevent circular dependencies (e.g., forbidding imports from `src/components` into `src/lib`).

### Fixed
- **Headless Operations**: Resolved issues where `Chamfer` and `Union` operations returned valid shapes but missed `volume`/`boundingBox` properties in test environments.
- **State Machine**: Hardened `WorkbenchContext` against invalid state transitions during sketch mode.


## [0.6.0] - 2026-01-27
### Added - Professional Modeling Workflow
- **Sketch Visualization**: Toggleable cyan/blue line rendering for sketches in the 3D scene.
- **Show/Hide Sketches**: Toolbar button to toggle visibility of all sketches.
- **Face Selection & Sketching**: Support for `.sketchOnFace()` and creating sketch planes from 3D faces.
- **Advanced Boolean UI**: Cleaner interfaces for Union, Subtract, and Intersect operations.
- **Geometry Engine Updates**: Worker now extracts and meshes sketch wires for visualization.
- **Enhanced Feature Execution**: Support for target selection and contextual feature execution.

### Changed
- **Workbench Architecture**: Updated `WorkbenchContext` to manage sketch geometries and visibility state.
- **Viewer Component**: Now renders `lineSegments` for sketches alongside solid geometries.
- **Worker Logic**: Injected `startSketch` wrapper to automatically capture all sketches created in user code.

### Fixed
- **Worker Stability**: Improved handling of large meshes and buffer transfers.
- **Coordinate System**: Better alignment between sketch planes and 3D world coordinates for face-based sketching.


## [0.4.0] - 2026-01-26
### Added - CAD-Style View Modes
- **3 Professional View Modes** matching CATIA/Fusion360/NX standards:
  - **Shaded with Edges** (Default) - Flat-shaded surfaces with black edge lines
  - **Wireframe** - Clean geometric edges only (NOT mesh tessellation)
  - **Shaded** - Smooth surfaces without edges
- **CAD Material System** (`materials.ts`):
  - MeshLambertMaterial (matte, no specular) instead of PBR
  - EdgeGeometry (15° threshold) for sharp geometric features
  - LineBasicMaterial for clean black edges
- **CAD Lighting System** (`lighting.ts`):
  - Headlight (0.7 intensity, follows camera)
  - Bright ambient (0.5 intensity, CAD principle: clarity over realism)
  - Rim light (0.3 intensity, for depth perception)
  - No shadows, no realistic fall-off
- **View Mode UI Controls**:
  - Toggle buttons in Header (Box/Grid/Circle icons)
  - Active state highlighting
  - Keyboard-accessible

### Changed
- **Replaced PBR Materials**: MeshStandardMaterial → MeshLambertMaterial for CAD clarity
- **Viewer Component**: Now supports 3 rendering modes with proper edge visualization
- **State Management**: Added `viewMode3D` to WorkbenchContext

### Fixed
- **Wireframe Rendering**: Now uses EdgesGeometry instead of WireframeGeometry
  - Shows geometric edges (box boundaries, cylinders, fillets)
  - NOT mesh triangulation/tessellation
  - Matches professional CAD software behavior

### Testing
- **+14 Unit Tests** for CAD materials and lighting modules
- **85 Tests Total** (all passing)
- **100% Browser Verified**: All 3 modes switching smoothly
- **Modules Isolated**: Easy to test, replace, and expand

### Technical Details
- **Code Added**: ~200 lines (materials.ts, lighting.ts, viewMode.ts, Viewer updates)
- **Architecture**: Fully modular with dependency injection ready
- **Performance**: 60fps in all modes, no memory leaks on mode switching
- **Edge Threshold**: 15° for sharp geometric features only

## [0.2.1] - 2026-01-26
### Fixed
- **Default Template Array Return**: Changed default template from `return filleted.cut(cyl);` to `return [filleted.cut(cyl)];` to enable AST auto-update of return statements.
- **Shape Visibility**: Box/Cylinder insertions now correctly appear in 3D view after insertion.

### Refactored
- **Feature Organization**: Extracted features into dedicated files (`box.feature.ts`, `cylinder.feature.ts`, `modifiers.feature.ts`) for better maintainability.
- **Code Cleanup**: Removed dead Regex code (~70 lines) replaced by AST implementation:
  - Deleted `findInsertionPoint()` - replaced by AST
  - Deleted `updateReturnStatement()` - replaced by AST
  - Kept `generateUniqueName()` and `extractVariables()` (still in use)
- **Simplified Insertion**: `useCodeInsertion.ts` now exclusively uses AST Command Pattern for shape insertions.

### Documentation
- **Updated Roadmap**: Added comprehensive ROADMAP 3.0 aligned with CATIA/Fusion360/NX workflows.
- **CAD Workflow Comparison**: New document comparing current state with professional CAD systems.
- **Phase Planning**: Detailed phases for Sketching (v0.3), View Modes (v0.4), and Advanced Features (v0.5).

### Technical
- **Code Reduction**: -160 lines (-62% reduction in modified files)
- **Test Suite**: 71 tests passing (removed 6 obsolete tests for deleted functions)
- **Browser Verified**: Full smoke test confirms Box/Cylinder insertions working perfectly

## [0.2.0] - 2026-01-26
### Added
- **AST-Based Code Manipulation**: Replaced fragile Regex patterns with robust Abstract Syntax Tree (AST) using `acorn` parser.
- **Syntax-Aware Insertion**: Shape insertion now uses AST traversal to find the correct `drawPart` function and return statement.
- **Auto-Return Updates**: Automatically appends inserted variables to return array (e.g., `return [box]` → `return [box, cylinder]`).
- **Command System**: Implemented Command pattern with Undo/Redo support for code changes.
- **Feature Registry**: Added pluggable feature system for Box, Cylinder, and Sphere primitives.
- **Comprehensive Testing**: Added 39 new tests (24 unit + 15 integration) covering edge cases and full workflow.

### Changed
- **Code Insertion Logic**: Migrated from Regex to AST-based manipulation in `ast.ts`.
- **Toolbar Integration**: Toolbar now uses feature registry and command system.
- **Package Dependencies**: Added `acorn`, `acorn-walk`, and `astring` for AST processing.

### Fixed
- **Comment Corruption**: AST prevents Regex bug where comments containing "return" were incorrectly modified.
- **String Literal Matching**: No longer matches patterns inside string literals.
- **Nested Functions**: Correctly identifies target function scope instead of matching any return statement.

### Technical Details
- **Incremental Implementation**: 6-phase rollout with browser verification at each step.
- **Browser Compatible**: All AST libraries work in browser without bundler issues.
- **Test Coverage**: 77 tests passing (39 new AST tests + 38 existing tests).
- **Backup Available**: Old Regex implementation preserved in `ast-regex.ts`.

## [0.1.0] - 2026-01-25
### Added
-   **Scene Browser**: Fusion 360-style feature tree listing all objects (`box1`, `cyl2`) with "Jump to Code" functionality.
-   **Workbench Architecture**: Complete refactor of `App.tsx` into a modular context-based system.
-   **GUI Mode**: Dedicated Design view with Toolbar and Browser sidebar.
-   **Smart Insert**: Context-aware code insertion that respects scopes and return statements.
-   **Structure**: New component library (`src/components/Layout`).

### Changed
-   **Web Worker**: Improved geometry execution stability.
-   **Performance**: Reduced main thread blocking during re-computation.


## [0.0.1] - 2026-01-25
### Added
-   **Initial MVP**: Editor, Viewer, and Geometry Engine.
-   **Advanced Features**: `fillet`, `chamfer`, `makeCompound`.
-   **Export**: STEP and STL export capabilities.
-   **Architecture**: Modular design with `geometryHelpers` and `geometryExports`.
-   **Testing**: Unit tests with Vitest.
-   **CI/CD**: GitHub Actions for automated deployment.
