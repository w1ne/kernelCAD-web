---
name: kernelcad-mcp
description: kernelCAD MCP server (kernelcad mcp) — introspect a running model, list features, run edit ops, fetch diagnostic codes. Use when you need to inspect a live model dynamically rather than re-evaluate from source.
---

# kernelCAD — MCP companion

## When to load this skill

Load when `kernelcad mcp` is available and you need to inspect or edit a live model without re-running the full CLI on every change. The MCP server exposes dynamic introspection tools that operate on evaluated in-memory state.

## MCP tool surface

When you have `kernelcad mcp` available, use the MCP tools for dynamic introspection rather than re-running the CLI. The MCP server exposes the current tool registry, including:

### Evaluation and introspection

- `evaluate_script({ file? code? })` — pass/fail + featureCount + diagnostics
- `list_features({ file? code? })` — array of feature summaries (kind/id/params/inputs)
- `list_assemblies({ file? code? })` — captured assembly intent: assemblies, parts, named connectors, fixed connections, joints, and aggregate models
- `inspect_assembly({ file? | code?, assembly? })` — physical assembly inventory for agents: named parts, bboxes, connectors, mates, mechanical review facts, disconnected solids, `unexplainedGeometry`, and a next-action prompt. Run this before accepting visually suspicious mechanisms; random/floating geometry must be repaired or explicitly justified by the original prompt.
- `get_shape_info({ file? code?, feature_id? })` — volume/surfaceArea/bbox of a feature (default: last)
- `list_topology({ file? code?, feature_id? })` — canonical face names + edge count
- `get_edges_of({ file? code?, feature_id?, face_name })` — boundary edges of a face (centroid, length, isClosed)
- `list_edges({ file? code?, feature_id? })` — enumerate all edges (index, centroid, length, isClosed)
- `list_faces({ file? code?, feature_id? })` — enumerate all faces with area and centroid
- `list_face_labels({ file? code?, feature_id? })` — canonical face names resolvable on a feature
- `get_face_lineage({ file? code?, feature_id, ref })` — walk the HistoryMap chain that produced a named face/edge ref; returns `{ chain, usedFallback }`.

### Diagnostics

- `why_did_this_fail({ file? code?, feature_id? })` — walk the upstream chain of a failing feature; returns each upstream feature's id/kind/health/diagnostics in topological order (per-code hints already inline on every diagnostic). Use when `code` is `recompute.input.missing` to find the root cause.
- `list_diagnostic_codes({})` — return the full diagnostic catalogue with hint templates, structured next-actions, and per-code metadata (one-shot; useful at session start to pre-populate retry strategies).
- `list_api({})` — full curated API surface (globals, Shape methods, Sketch methods, constrained-sketch capability)
- `lookup_cookbook({ query, k? })` — retrieve up to k canonical pattern snippets ranked by BM25; returns `{ ok, hits[] }`. Empty hits is a valid success ("no canonical pattern; proceed without cookbook help").

### Source edit operations

All edit tools return the modified source plus diagnostics. Re-run `kernelcad evaluate` on the returned source before committing.

- `set_param_value({ code, param_name, new_value })` — edit a `param()` default value and return modified code plus diagnostics
- `add_feature({ code, feature_code })` — insert one source line before the last top-level return and return modified code plus diagnostics
- `add_assembly_part_source({ code, assembly_binding, part_name, shape_expression, binding_name?, at? })` — insert `const <binding> = <assembly>.part(...)` and return modified code plus diagnostics. Use the returned/bound part ref for connector source edits.
- `add_part_connector_source({ code, part_binding, name, type, origin, axis?, normal? })` — insert `<partBinding>.connector(...)` durably in source. This is side-effect-free and distinct from active-session `add_connector`.
- `add_mate_source({ code, assembly_binding, name, a, b, type, pose?, limitsDeg?, limitsMm? })` — insert `<assembly>.mate(...)` durably in source. This is side-effect-free and distinct from active-session `add_mate`.
- `add_mate_coupling_source({ code, assembly_binding, driven, source, ratio, offset? })` — insert `<assembly>.coupleMates(...)`; pair coupled mates with a physical transmission declaration.
- `add_transmission_source({ code, assembly_binding, name, kind, sourceMate, drivenMates, path, actuator?, input?, output?, ratio?, notes? })` — insert `<assembly>.transmission(...)`; supported kinds are `direct-horn`, `link-rod`, `four-bar`, `gear-pair`, `belt`, and `tendon`.
- `add_workspace_target_source({ code, assembly_binding, connector_ref, reachable, toleranceMm? })` — insert `<assembly>.workspace(...)` so `solvedModel(..., { posesGate: 'envelope' })` / `review_cad` can check reachability.
- `set_scene_return_source({ code, assembly_binding, mode, poses?, options? })` — replace the final top-level return with `<assembly>.model()` or `<assembly>.solvedModel(poses, options?)`. Use `solvedModel({})` for mate-authored mechanisms so FK and validation run.
- `add_nurbs_surface({ code, controls?, degree?, weights?, knots?, periodic?, section_sketch_ids?, binding_name? })` — insert a `nurbsSurface(...)` or `surfaceFromCurves(...)` call; returns modified code + diagnostics. Chain `.thicken(t)` / `.toShape()` via the existing `add_feature` tool on the returned binding name.
- `add_nurbs_curve({ code, controlPoints, degree?, weights?, knots?, closed?, binding_name? })` — insert a `nurbsCurve(...)` declaration before the last top-level return. The new binding is the 3D parametric curve consumed by `variableSweep` as a spine and by `surfaceFromBoundary` as a boundary edge. Validates Vec3 + control-point count; full validation re-runs via the post-edit evaluateScript pass.
- `add_surface_from_boundary({ code, curve_bindings, continuity?, sampling?, binding_name? })` — insert a `surfaceFromBoundary([c1, c2, c3, c4], opts?)` declaration before the last top-level return. Builds the shipped filling surface: one NURBS face through 4 boundary Curve3D refs. `curve_bindings` must be a tuple of 4 Curve3D variable names declared earlier in exact loop order: `[0]` bottom, `[1]` right, `[2]` top, `[3]` left; each is regex-validated. `continuity` accepts a single grade (`'C0' | 'C1' | 'C2'`) applied to all 4 edges or a length-4 per-edge array; defaults to `'C0'`. The result is a Surface — chain `.thicken(t)` or `.toShape()` via `add_feature` on the returned binding.
- `add_hermite_g2({ code, a, b, binding_name? })` — insert a `hermiteG2(a, b)` declaration before the last top-level return, where each endpoint is `{ point: Vec3, tangent: Vec3, curvature?: Vec3 }`. The result is a Curve3D consumable by `add_variable_sweep` (spine input) or `add_surface_from_boundary` (boundary curve). Use to bridge two existing curves with G2 continuity — tangent magnitude is the first derivative (not unit length); typical magnitude ~ chord length between endpoints.
- `add_path_spline({ code, chain_anchor, points, tension?, startTangent?, endTangent?, binding_name? })` — inject a `.spline(points, opts?)` call into an EXISTING PathBuilder chain on the named `chain_anchor` variable. The call is injected immediately before any `.close()` in the chain (or before the statement terminator if absent). `points` is a `Vec2[]` (mm) ≥ 2; the path interpolates through every waypoint. Use for freeform 2D outlines authored from measured waypoints (eyewear brow, ergonomic handles). 2D analogue of `add_nurbs_curve` for the path-builder lane.
  - `startTangent?: [number, number]` — optional 2D tangent vector at the first waypoint. Direction matters; magnitude is normalised internally.
  - `endTangent?: [number, number]` — optional 2D tangent vector at the last waypoint. Same semantics as `startTangent`.
  - Tangent-constrained fits route through the JS interpolator and round-trip through the kernel so authoritative geometry stays canonical. When both tangent fields are omitted, the call lowers through the existing fast path unchanged.
- `add_path_nurbs_segment({ code, chain_anchor, controlPoints, degree?, weights?, knots?, binding_name? })` — inject a `.nurbsSegment(controlPoints, opts?)` call into an EXISTING PathBuilder chain. `controlPoints[0]` must match the current pen position within 1e-6 mm; default `degree: 3`. Use when the control net is the natural mental model (programmatic profile generation, NURBS round-tripping).
- `add_path_hermite_g2({ code, chain_anchor, a, b, binding_name? })` — inject a `.hermiteG2(a, b)` call into an EXISTING PathBuilder chain. Each endpoint is `{ point: Vec2, tangent: Vec2, curvature?: Vec2 }`; `a.point` must match the current pen position. Use for G2-continuous transitions between adjacent path runs (eyewear bridge ↔ brow). 2D analogue of `add_hermite_g2`.
- `trace_from_image({ imageUrl, hint?, features?, maxWaypointsPerFeature?, backend? })` — trace pixel-space features from a reference photo into normalized `[0..1]` waypoints feedable to `add_path_spline` / `add_path_nurbs_segment` after a scale-anchor conversion to mm. Three backends are dispatched: `opencv` (deterministic; uniform-bg silhouette only), `vision-llm` (Claude vision; caller-supplied `ANTHROPIC_API_KEY`), `hybrid` (opencv silhouette + LLM-labeled named points); default `backend: 'auto'` routes by corner-color stddev. Per-feature `confidence` is reported. Pair with the `kernelcad-trace-from-image` sub-skill (under `kernelcad-from-reference/`) for the conversion-to-mm pipeline.
- `add_variable_sweep({ code, spine_binding, sections, closed?, continuity?, binding_name? })` — insert a `variableSweep(spine, [{t, profile}, ...], opts?)` declaration before the last top-level return. `spine_binding` and each `sections[i].profile_binding` must already exist as variable names in `code` (regex-validated by the tool). `sections` is a `{ t: number; profile_binding: string }[]` array with strictly increasing `t`, anchored at `t=0` and `t=1`. Orientation is not exposed by MCP until runtime orientation support is wired.
- `add_sketch_text({ code, content, size, font?, align?, position?, rotation?, bindAs? })` — insert a `sketch.text(...)` call before the last top-level return and return modified code plus diagnostics. Pair with subsequent `.extrude(...)` / `cut(...)` edits to land an engraved or raised text feature.
- `emboss_text({ code, target, textContent, size, depth, face, fontFamily?, align?, anchorU?, anchorV?, rotation?, scaleMode?, bindAs? })` — insert a `<shape>.embossText({...})` chained call before the last top-level return. `depth > 0` raises text out of the face (fuse); `depth < 0` engraves text into it (cut). UV anchors are face-local in `[0, 1]`. Use for branded consumer products (Ray-Ban temple, CE compliance marks, appliance model numbers).
- `project_curve({ code, target, curveExpression, face, scaleMode?, asEdge?, bindAs? })` — insert a `<shape>.projectCurve({...})` chained call before the last top-level return. Wraps a 2D closed curve onto a 3D face along the face normal; returns a `Sketch` — pair with `.extrude(d)` for raised silhouettes or with the parent's `.subtract(...)` for engraved logos. `asEdge: true` is captured but currently deferred at lower time (BRepProj_Projection not bundled).
- `remove_feature({ code, match })` — remove one uniquely matched non-return line and return modified code plus diagnostics

### Params

- `params_list({})` — list symbolic parameters declared on the active evaluated session, including current value, default, type, and metadata.
- `params_update({ edits })` — edit one or more active-session params atomically and re-lower affected records; returns a shape preview, skipped/relowered record ids, and soft warnings.

### Constrained sketches

- `solve_sketch({ entities, constraints })` — solve a 2D POINT/LINE/CIRCLE sketch constraint set; returns `{ ok, entities, constraints }` or validation errors. Side-effect-free.
- `add_constraint({ constraints?, constraint })` — validate and append one sketch constraint to a constraint list; returns the updated list. Side-effect-free.
- `list_constraints({ constraints? })` — list supported sketch constraint types (`COINCIDENT`, `DISTANCE`, `HORIZONTAL`, `VERTICAL`, `PARALLEL`, `PERPENDICULAR`, `EQUAL_LENGTH`, `TANGENT`, `RADIUS`, `ANGLE`, `CONCENTRIC`, `SYMMETRIC`) and echo the provided constraint list.

### Sheet metal and SDF probes

- `flatten_pattern({ file? | code?, feature_id? })` — return an unfolded sheet-metal `Region` as JSON with outer ring, holes, and bend lines. Use before CAM/nesting assumptions.
- `get_bend_table({ file? | code?, feature_id? })` — list sheet-metal bend records with K-factor bend allowance, axis line, and parent options.
- `evaluate_sdf({ file? | code?, fieldName, point })` — sample a bound SDF field at `[x, y, z]`; returns distance/inside/AABB/kind without materializing the field.

### Assembly and mate tools

- `add_connector({ part, name, type, origin, axis?, normal?, assembly? })` — register a mate-style connector on a named part of the active assembly; requires a prior `evaluate_script`. `type` is one of `frame`/`axis`/`planar`/`ball`. `origin` accepts a `[x, y, z]` shorthand or a structured `ConnectorOrigin`.
- `add_mate({ name, a, b, type, pose?, limitsDeg?, limitsMm?, assembly? })` — declare a typed mate between two `"<partName>.<connectorName>"` refs on the active assembly. `type` is one of `fastened`/`revolute`/`prismatic`/`cylindrical`/`planar`/`ball`/`pin_slot`; capture-time validation surfaces type-mismatch / connector-not-found errors.
- `list_mates({ assembly? })` — return the declared mate records on the active assembly: `{ mates: [{ name, a, b, type, pose?, limitsDeg?, limitsMm? }, ...] }`.
- `validate_assembly({ assembly? })` — run the mate-aware validator on the active assembly; returns `{ status, diagnostics, partCount, jointCount }` where each diagnostic carries `code` and `hint` for recovery.
- `solve_mates({ assembly?, poses? })` — run the mate-graph solver on the active assembly; returns `{ status, poses, iterations? }` with each pose serialized as `{ translation, rotateAxis, rotateDeg }`. The `poses` input overrides mate pose values by mate name; coupled driven mates are expanded from their source mate before solve.
- `review_cad({ file? | code?, assembly?, includePoseEnvelope?, includeInterference?, samplesPerMate?, combinatorial?, epsilonMm3?, trackConnectors?, gripperAperture? })` — evaluate a script, validate its assembly/mate graph, check that mate connectors touch modeled material, sample declared mate limits, optionally run BREP interference checks at those samples, report connector workspace bounds, optionally report gripper aperture between two fingertip connector refs, and return raw diagnostics plus a fitness summary (`fitness.functional`, `fitness.blockingReasons`, `fitness.mechanismSummary`) after an assembly is selected. `samplesPerMate` (integer ≥ 1, default 1) is the **total** sample count per declared-limit mate — `1`/`2` = corners only, `>=3` adds `samplesPerMate - 2` uniform interior points. `combinatorial` (default false) emits all `2^M` min/max corner-tuples across mates with declared limits and is capped at `M <= 8` (`M=9` throws with `combinatorial sampling capped at 8 mates with declared limits`). `review_cad` always returns `repairContext: RepairContext` (see below).
- `design_loop({ goal, attempts, assembly?, preserveInterfaces?, includePoseEnvelope?, includeInterference?, samplesPerMate?, combinatorial?, epsilonMm3?, trackConnectors?, gripperAperture?, stopOnPass?, allowReviewWarnings?, requireVisualReview?, outputRecordPath?, recordTitle? })` — review ordered design attempts, return repair prompts, and optionally write a Studio-compatible replay record. `samplesPerMate` / `combinatorial` are forwarded to `review_cad` with the same semantics (corners-only at `1`, interior coverage at `>=3`, full-corner sweep at `combinatorial: true`, cap of 8 limited mates). `nextActionPrompt` is rendered from each attempt's `repairContext` — blocking reasons first, then the top three diagnostics with explicit `widen by N` / `narrow by N` directives when a `suggestedDelta` is present. Accepted visual reviews must include `screenshotPath`, non-empty `findings`, and passing checks; otherwise `assembly.visual.review-incomplete`, `assembly.visual.review-evidence-weak`, or `assembly.visual.review-check-failed` keeps the attempt from passing. Set `requireVisualReview: false` only for explicit non-visual batch checks.
- `review_paint_peek_latest({ freshness_sec?, extra_roots?, paths_only? })` — return the newest Studio inpainting-style review packet (screenshot + red mask + raycast-resolved struck-part list) the user painted from `MarkingOverlay` within the freshness window. PNGs are inlined base64 by default; pass `paths_only: true` for paths + metadata only. Mirrors what the Claude Code `UserPromptSubmit` hook auto-attaches, but works from any MCP-capable client (Cursor, Claude Desktop, ChatGPT-with-MCP) on the same machine. Returns `{ ok, packet?, empty?, scanned_roots, scanned_candidates }`.

`review_cad` returns this `repairContext` on both the `ok: true` and `ok: false` branches so a calling agent always has a structured handle on what to fix and what to preserve:

```typescript
interface RepairContext {
  readonly blockingReasons: readonly string[];    // formatted "code: message" from fitness.blockingReasons
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

`suggestedDelta.widenBy` / `narrowBy` are in **degrees** for revolute / cylindrical / pin_slot mates and **mm** for prismatic mates — the same unit as the diagnostic's `limits` field. `topDiagnostics` is capped at three entries, ordered by severity. `preserveInterfaces` and `designGoal` echo the inputs so the repair agent doesn't drop them between attempts.

### Export

- `export_model({ file? | code?, output_path, format, feature_id?, options? })` — write the script geometry to a file server-side. `format` is one of `stl`, `step`, `dxf`, `3mf`, `glb` (the reserved `urdf`, `srdf`, `sdf-gazebo` slots ship in a follow-up slice and return a structured `*.not-implemented` diagnostic today). Returns `{ ok, output_path, byte_count, feature_count, format, diagnostics }`. `feature_count` is the total features in the script, not the count contributing to the exported shape.

  **Per-format options** (passed via `options`):
  - `stl` — no options.
  - `step` — `unit?: 'mm' | 'cm' | 'in'`.
  - `dxf` — `unit?: 'mm' | 'cm' | 'in'` (default `mm`); `tolerance?: number` (chord tolerance for polyline flattening; mm; default 0.05); `layers?: DxfLayerSpec[]` (named layers for cut profiles; bend lines always emit on a dedicated `BEND` layer). Output is `LWPOLYLINE`-only; the input must be planar — non-planar geometry fails with `export.dxf.non-planar` and a `list_faces` next-action.
  - `3mf` — `printUnit?: 'mm' | 'cm' | 'in'` (default `mm`); `embedSource?: boolean` (when `true`, the source script is attached to the 3MF under `Metadata/source.kcad.ts`). Watertightness is verified before write; non-manifold meshes fail with `export.3mf.not-watertight`.
  - `glb` — `axis?: 'y-up' | 'z-up'` (default `y-up`; world-units convention is mm). `draco?: false` is reserved for a follow-up slice; passing `draco: true` is a static type error today and a runtime `export.glb.draco-glass-conflict` if the type is widened upstream.

  PBR materials propagate from `.material({...})` calls in the script through `MeshPhysicalMaterial` into the glTF `KHR_materials_*` extensions (transmission / clearcoat / anisotropy / sheen / volume / ior). 3MF carries the `baseColor` only (the format has no rich PBR slot). DXF carries no material.

- `export_stl({ file? | code?, output_path, feature_id? })` — *Deprecated alias for `export_model({ ..., format: 'stl' })`. Removal scheduled for the next minor version. Use `export_model` for all new code.*

## Topology references — the `@kc[...]` grammar

kernelCAD addresses faces, edges, vertices, and connectors as stable string references that survive most upstream edits. The grammar is kernelCAD's topology-reference language; it is emitted by introspection tools and accepted by every tool that consumes a face / edge / connector handle.

### Form

```
ref       ::= '@kc[' path ']'
path      ::= owner ( '/' kind ( '/' segment )* )?
owner     ::= name | name '[' digit+ ']'
kind      ::= 'face' | 'edge' | 'vertex' | 'connector' | 'sketch' | 'part' | 'solid'
segment   ::= name | name '[' digit+ ']'
name      ::= [A-Za-z][A-Za-z0-9_-]*
modifier  ::= '#' ( 'normal' | 'axis' | 'center' )
```

The seven kinds carry distinct semantics:

| Kind | Refers to |
|---|---|
| `face` | A single face of a shape (canonical or user-labeled). |
| `edge` | A single edge of a shape (canonical box / cylinder / sketch-derived names). |
| `vertex` | A single vertex. (v1: surface acceptance; resolver lift queued for v2.) |
| `connector` | A named connector frame on an assembly part. |
| `sketch` | A captured `sketch()` binding by name. |
| `part` | A named assembly part (default kind when only `@kc[<owner>]` is given). |
| `solid` | A top-level captured solid feature. |

Three v1 modifiers attach a sub-aspect of the named entity:

| Modifier | Meaning |
|---|---|
| `#normal` | The face-normal vector at the entity. |
| `#axis` | The principal axis vector (cylinder edge, axis connector). |
| `#center` | The entity's centroid. Default when no modifier is supplied on a `face` ref. |

`segment` and `owner` accept an optional `[N]` index — used by batched feature emitters (`mountingHoles[2]`) and by indexed array entries inside the path. Spec §3.1 indexed segments survive round-tripping through `formatTopoRef`.

### Reserved characters

These characters are reserved by the grammar wrapper and the path separators; the capture-time uniqueness validator rejects any face label, part name, connector name, or feature name containing one of them:

```
. / * ? , # [ ] @ <whitespace>
```

Renaming offenders is the recovery path; the gate does not loosen.

### Examples

```
@kc[base/face/top]                      # canonical face on a primitive
@kc[base/face/lid]                      # user-declared faceLabel
@kc[base/edge/top-front]                # canonical box edge
@kc[shoulder-servo/connector/flange]    # connector on a named part
@kc[hole1/face/wall]                    # ordinal feature ref: hole #1's wall
@kc[mountingHoles[2]/face/wall]         # indexed access into a batched feature
@kc[base/face/top#normal]               # sub-aspect modifier — face-normal vector
@kc[servo/edge/top#axis]                # cylinder cap edge as an axis vector
@kc[base/part]                          # bare part ref (kind defaults to 'part')
```

### When to use refs vs structured forms

| Situation | Form |
|---|---|
| Agent passing a face/edge/connector handle between tools | `@kc[...]` string (canonical handoff) |
| Output of `list_faces` / `list_edges` / `inspect_assembly` | always emits `ref: '@kc[...]'` strings |
| Hand-authored `.kcad.ts` against canonical names | bare canonical name (e.g. `'top'`) — still accepted |
| Programmatic / batch construction of selectors | structured form (e.g. `{ kind: 'face-center', name: 'lid' }`) — still accepted |
| Cross-tool agent emission and resolution | `@kc[...]` string — most stable, lineage-walked first, snapshot-fallback second |

The structured forms remain valid escape hatches. The `@kc[...]` string form is the preferred handoff because it survives the resolver's two-path lookup (lineage first, then geometry snapshot) and round-trips cleanly through MCP tool envelopes.

### Tools that emit refs

| MCP tool | Field |
|---|---|
| `list_faces` | `faces[i].ref` (string) and `faces[i].lineage` (struct). The legacy `faces[i].id: 'f<idx>'` stays one release with `deprecated: true`. |
| `list_edges` | `edges[i].ref` (string). |
| `inspect_assembly` | Topology-bound connector summaries carry `origin: '@kc[<part>/<kind>/<name>]'` plus a `resolved: [x, y, z]` numeric vec3 for direct downstream consumption. |

### Tools that accept refs

| MCP tool | Input slot |
|---|---|
| `add_mate` | `a` / `b` accept the legacy `'<partName>.<connectorName>'` dot form OR `'@kc[<partName>/connector/<connectorName>]'`. |
| `add_connector` | `origin` accepts `[x, y, z]`, a structured `ConnectorOrigin`, OR `'@kc[<part>/face/<name>]'` (face-center default; `#normal` for the face-normal direction). |
| `add_feature` | When the feature line includes a face selector (`hole`, `holes`, `cutout`, `shell`, `fillet`, `chamfer`), the selector accepts `@kc[<owner>/face/<name>]` strings, structured `{ face: <name> }` forms, or bare canonical names. |
| `resolve_topo_ref` | The discovery primitive — pass `{ ref, file? | code? }` to confirm a ref still resolves on the current geometry. |

Capture-time `Connector.origin` (the script API on `partRef.connector(name, opts)`) also accepts `origin: '@kc[<part>/face/<name>]'` directly; the ref is normalised to a structured `ConnectorOrigin` at capture-time so downstream review tools see the same shape they always did.

### Resolution semantics

When a ref is consumed, the resolver tries two paths in order:

1. **Name-propagation** (primary). The ref's `<owner>/<kind>/<name>` tuple matches against the lineage map carried on every shape — canonical names, user-declared `faceLabels`, feature-kind + ordinal + label combinations.
2. **Geometry-snapshot fallback**. When lineage returns zero hits but a snapshot captured at the ref's original creation still matches a current face within tolerance, the resolver recovers the entity geometrically and surfaces an info-severity warning.

Three diagnostic codes surface through `KernelError.hint` and the MCP error envelope:

- `feature.face-ref.not-resolvable` — both paths returned zero. Hint lists nearest current-face candidates.
- `feature.face-ref.ambiguous-after-split` — lineage matched N >= 2 surviving descendants. Hint lists the N candidate refs.
- `feature.face-ref.snapshot-fallback-used` — info-severity; resolution went through the snapshot path and is provisional. Tighten the ref or accept the warning.

Read the hint — it carries the recovery move (paste a candidate ref, narrow the selector, or accept provisional resolution).

### `resolve_topo_ref` — discovery primitive

`resolve_topo_ref({ file? | code?, ref })` is the tool an agent calls when it already holds a ref (typically from a prior `list_faces` / `list_edges` / `inspect_assembly` call) and wants to confirm the ref still resolves on the current geometry, or wants to inspect what an upstream tool emitted.

```json
{
  "name": "resolve_topo_ref",
  "input": { "code": "<.kcad.ts source>", "ref": "@kc[base/face/top]" },
  "output_ok": {
    "ok": true,
    "ref": "@kc[base/face/top]",
    "entity": { "kind": "face", "hash": "...", "path": "lineage" }
  },
  "output_ambiguous": {
    "ok": false,
    "errorCode": "feature.face-ref.ambiguous-after-split",
    "candidates": ["@kc[base/face/top-1]", "@kc[base/face/top-2]"],
    "errorHint": "..."
  }
}
```

`entity.path` reports which resolver path succeeded — `'lineage'` (preferred, stable) or `'snapshot'` (geometric fallback, provisional). Use the ambiguity / not-resolvable hint to repair the ref, then re-call.

### Notes on script API vs MCP tools

`arm.transmission(name, { kind, sourceMate, drivenMates, actuator?, input?, output?, path, ratio?, notes? })` is script API and can be authored durably through `add_transmission_source`. Use it when `coupleMates(...)` declares a driven mate. `review_cad` emits `assembly.transmission.missing-for-coupled-mate` if a coupled mate has no matching transmission path, and `assembly.transmission.path-disconnected` when consecutive transmission `path` parts are separated at the current or any sampled mate-limit pose.

For the full mechanism build loop (robot arms, grippers, linkages), see `kernelcad-assemblies`.

## Query DSL — the `@kcq[...]` grammar

`@kcq[...]` is the string surface for composed Queries. Use `@kc[...]` when one entity is addressable by `<owner>/<kind>/<name>`; use `@kcq[...]` when set algebra or filter composition matters. Both surfaces dispatch through the same evaluator (strings-as-sugar), so the resolved entity set is identical regardless of which form the agent reaches for.

### Grammar

```
queryRef    ::= '@kcq[' expr ']'
expr        ::= union | intersection | subtraction | filter | empty
empty       ::= 'nothing()' | 'everything(' entityKind ')'
union       ::= 'union(' exprList ')'
intersection::= 'intersection(' exprList ')'
subtraction ::= 'subtraction(' expr ',' expr ')'
filter      ::= entityKind '(' filterList? ')'
entityKind  ::= 'face' | 'edge' | 'vertex' | 'connector' | 'part' | 'solid'
filterList  ::= filterExpr (',' filterExpr)*
filterExpr  ::= 'createdBy(' string (',' entityKind)? ')'
              | 'ownedByPart(' expr ')'
              | 'ownerPart(' expr ')'
              | 'containsPoint([' x ',' y ',' z '])'
              | 'closestTo([' x ',' y ',' z '] (',' k)?')'
              | 'geometryType(' geomType ')'
              | 'withLabel(' string ')'
              | 'withFeatureName(' string ')'
              | 'nthElement(' expr ',' integer ')'
              | expr
```

### Examples

```
@kcq[face(createdBy("arm"))]                           # equivalent to kc.q.face(kc.q.createdBy('arm'))
@kcq[face(createdBy("arm"), closestTo([0,0,10]))]      # narrowed face
@kcq[union(face(createdBy("a")), face(createdBy("b")))]
@kcq[subtraction(face(createdBy("a")), face(withLabel("lid")))]
@kcq[nothing()]                                        # empty
@kcq[everything(face)]                                 # all faces
```

### Coexistence with `@kc[...]`

The MCP-boundary dispatcher (`parseAnyTopologyInput`) distinguishes by prefix:

- `@kc[...]` → `parseTopoRef` → `topoRefAsQuery` → `Query<unknown>` (simple-ref path)
- `@kcq[...]` → `parseQuery` → `Query<unknown>` (composed-query path)
- JSON-AST object → reconstructed from `ast` → `Query<unknown>`
- Query value → passthrough unchanged

Both surface syntaxes resolve through the same evaluator; the kernel sees one type either way. Diagnostic prose pins on the `@kc[...]` form by default (more compact and prose-pasteable); reach for `@kcq[...]` when the build needs set algebra or multi-filter narrowing. `Query.toString()` always serialises to the canonical `@kcq[...]` form, so `parseQuery(q.toString())` round-trips structurally.

## Cookbook — Query DSL inspect-first pattern

### Q-S6 — Inspect first, build after

The canonical agent flow whenever the expected entity count is uncertain: express the Query, inspect the AST or the canonical `@kcq[...]` descriptor via `.toString()`, then narrow or consume. `Query<T>` values are lazy — construction is cheap and side-effect-free, so an agent can build many candidate Queries and reason over their descriptors before committing.

```typescript
// 1. Express the candidate Query.
const candidates = q.face().and(q.withFeatureName('box1'));

// 2. Inspect the descriptor without resolving. `.toString()` emits the
//    canonical `@kcq[<expr>]` form per the grammar above. For
//    `q.face().and(q.withFeatureName('box1'))` the descriptor is
//    `@kcq[intersection(everything(face), withFeatureName("box1"))]`,
//    which round-trips via `parseQuery(...)` to a structurally-equal AST.
const descriptor = candidates.toString();

// 3. The AST is plain data; the agent can walk it to read the filters at
//    each level.
candidates.ast;     // { op: 'intersection', queries: [...] }

// 4. Narrow further or consume — both stay on the same Query value.
const narrowed = candidates.and(q.withLabel('lid'));

// 5. JSON.stringify round-trips cleanly; chainable methods are
//    non-enumerable so the wire form carries only data fields. The
//    `evaluate_query` MCP tool (ships in a follow-on slice) consumes
//    exactly this JSON shape from outside the script.
JSON.stringify(narrowed);   // { "_kind": "kc.query", "target": "face", ... }
```

See `cookbook/snippets/Q-S6-inspect-first-build-after.kcad.ts`.

## Verification gates

| Gate | Pass criterion |
|------|----------------|
| G-mcp-reachable | `kernelcad mcp` is listening; tool calls return JSON-RPC results not transport errors |
| G-feature-id-stable | After re-evaluating the same script, `list_features` returns the same IDs (deterministic capture) — if not, the script is non-deterministic and should be fixed before using MCP edits |
| G-edit-then-reeval | After `add_feature` / `add_nurbs_surface` etc., re-run `kernelcad evaluate` on the resulting source to confirm the edit landed and evaluates clean |
| G-diagnostic-hint-cited | When relaying an MCP error to the user, include the `hint` field — it points at the fix |

## Related skills

- `kernelcad-authoring` — the API surface MCP operates on.
- `kernelcad-params` — `params_update({ edits })` is the live-edit path for symbolic parameters.
- `kernelcad-features` — face-ref queries and add-feature edits route through MCP.
- `kernelcad-assemblies` — assembly-specific MCP tools (`inspect_assembly`, `review_cad`, `design_loop`) and the mechanism build loop.
