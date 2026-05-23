---
name: kernelcad
description: kernelCAD entry decision tree — what skill to load when, universal conventions that apply everywhere. Load this FIRST; it points at the right specialty skill for your task.
---

# kernelCAD

A two-tier skill system. **Load `kernelcad-authoring` to write or modify any `.kcad.ts` model.** Add specialty skills as the task demands.

## Decision tree

- Authoring or editing `.kcad.ts` geometry → load `kernelcad-authoring`.
- Building from a reference photo or visual brief → also load `kernelcad-from-reference`.
- Adding fillets, chamfers, shells, holes, cutouts → also load `kernelcad-features`.
- Editable parameters / params_update / live sliders → also load `kernelcad-params`.
- Multi-part with joints / mates / connectors → also load `kernelcad-assemblies`.
- Need an off-the-shelf fastener, bearing, motor, header, or connector → also load `kernelcad-parts`.
- Freeform NURBS surfaces, NURBS curves, Coons patches, multi-section sweeps, G2 fillet continuity, or freeform 2D path outlines (`nurbsSurface`, `surfaceFromCurves`, `surfaceFromBoundary`, `nurbsCurve`, `spline3d`, `hermiteG2`, `variableSweep`, `fillet({ continuity: 'G2' })`, `path().spline(...)`, `path().nurbsSegment(...)`, `path().hermiteG2(...)`) → also load `kernelcad-nurbs`.
- Mechanical patterns (linear / circular / grid replication of a sub-feature) → also load `kernelcad-patterns`.
- Folded sheet-metal parts (brackets, channels, panels, bend tables, flat patterns) → also load `kernelcad-sheet-metal`.
- Signed-distance fields (smooth-blended primitives, organic shapes via `sdf.*` + `materialize`) → also load `kernelcad-fields`.
- Exporting an assembly to URDF for a motion planner or simulator → also load `kernelcad-urdf`.
- Adding planning groups / end-effectors / allowed-collision data on top of a URDF → also load `kernelcad-srdf`.
- Exporting an assembly with closed kinematic loops or a native ball joint → also load `kernelcad-sdformat`.
- Introspecting a running model via MCP (`list_features`, edit ops, diagnostics) → load `kernelcad-mcp` instead of authoring.

## Key globals available today

- `referenceImage(path, opts)` — show a reference photo as a plane overlay in the Studio viewport. No OCCT geometry; hidden during scoring. Supports `.png`, `.jpg`, `.jpeg`, `.webp`. See `kernelcad-authoring` for the full signature.
- `Shape.material(opts)` — apply a PBR material (baseColor, metalness, roughness, clearcoat, clearcoatRoughness, ior, transmission) to a shape. Must be called on leaf parts before they enter a boolean. Use instead of `.color()` when the reference shows gloss or specular highlights. See `kernelcad-authoring` Materials section for idiomatic examples.

## Universal conventions

- **Units**: millimetres, degrees, Z-up right-handed.
- **Return rule**: every `.kcad.ts` script `return`s a single `Shape` (or `Scene` from `assembly().model()`).
- **Diagnostic-anchored hints**: when a kernelCAD tool throws, the error carries a `hint` field tied to a diagnostic code (`feature.*`, `assembly.*`, etc.). Read the hint — it carries the fix.
- **Words to CAD / Words to geometry**: preserve the prompt-to-geometry mapping. Important nouns and constraints from the user's words should become named source sections, parameters, parts, connectors, materials, tests, or visible artifacts; do not reduce the job to untraceable hand-tuned shapes.
- **Source-first CAD**: the `.kcad.ts` file is the design source of truth. Generated screenshots, videos, STEP, STL, and score JSON are evidence/artifacts, not editable source. Change source, then regenerate explicit targets.
- **Derived artifacts are not source-of-truth**: exported files (`.step`, `.stl`, `.dxf`, `.3mf`, `.glb`, `.urdf`, `.srdf`, `.sdf`) are evidence and deliverables, not editable targets. To change geometry, edit the `.kcad.ts` script and re-export. Do not hand-edit derived files.
- **`@kc[...]` topology refs are the canonical handoff format**: faces, edges, vertices, and connectors are addressable as stable string refs of the form `@kc[<owner>/<kind>/<refName>]` (with optional `#modifier` for a sub-aspect of an entity, e.g. `#normal`, `#axis`, `#center`). Emit them from `list_faces` / `list_edges` / `inspect_assembly` outputs; paste them into `hole`, `fillet`, `add_mate`, `add_connector`, or `resolve_topo_ref`. The structured forms still work as escape hatches. Full grammar and resolution semantics live in `kernelcad-mcp/SKILL.md`.
- **No broad regeneration**: generate only the named output needed for the task (`kernelcad render`, `kernelcad export`, demo capture, portfolio capture). Do not run directory-wide artifact refreshes unless the user asked for a release/demo rebuild.
- **Catalog parts over fake geometry**: for real hardware such as servos, motors, bearings, fasteners, connectors, sensors, and boards, prefer `lib.fromSTEP(...)` with a recorded source/provenance over hand-modeled placeholder boxes/cylinders. Use placeholders only for blockouts or when the real part is unavailable.
- **Validation before screenshots**: use deterministic checks first (`kernelcad evaluate`, exports, `inspect_assembly`, `review_cad`, interference checks, scorer gates). Visual review is required evidence for rendered artifacts, but it does not replace geometry checks.
- **Deterministic visual evidence**: when visual evidence matters, run `kernelcad render inspect <file> <outDir>` to produce an inspection bundle with a manifest and canonical RGB views. Add `--channels rgb,mask,depth,normals` when machine-readable object masks, depth, or view-space normals are needed. Use `--focus <names>` or `--hide <names>` to isolate feature ids or assembly part names when clutter would obscure the check. Keep richer channels in the same manifest packet; do not replace the canonical RGB views.

## Mandatory visual-critique step (applies to ALL agents, every skill)

If your task produced or modified any rendered artifact (`.png`, `.mp4`, `hero-frame`, demo video, score render), you MUST visually inspect it before reporting done. This is non-negotiable:

1. **Read the rendered artifact yourself.** Use the `Read` tool on the PNG (your vision sees it) or sample 1–3 representative frames of an MP4.
2. **Compare against the reference**, if one exists (a `/tmp/*.png` the user shared, the photo path your task started with, the prior hero-frame, or the explicit visual spec).
3. **Describe what you actually see** in your final report — composition, proportions, visible defects. Not "all gates pass". Not "render complete". A one-sentence honest description: "watch is jammed against right edge, bail reads as solid disc, ribbon is a tilted plank".
4. **If the artifact has a visible defect, DO NOT report done.** Either fix it, or report honestly: "iteration N regressed, here is what's wrong, recommend rollback".

**Why this is a hard rule, not a guideline**: gate counts measure presence-of-parts (does the bail exist? is the count 96? interferences zero?), not whether the composition reads correctly. Subagent gate-success is preliminary. The human reviewer's eyes are the real scorer; the agent's `Read` of its own render is the proxy. Skipping this step has burned multiple iterations (pocket-watch 2026-05-20 shipped two regressions because gate-only verification declared success on broken compositions). The canonical iteration loop lives in `kernelcad-from-reference/image-replicator`; the rule applies whether you loaded that skill or not.
