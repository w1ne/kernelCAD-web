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
- Freeform NURBS surfaces, NURBS curves, Coons patches, multi-section sweeps, or G2 fillet continuity (`nurbsSurface`, `surfaceFromCurves`, `surfaceFromBoundary`, `nurbsCurve`, `spline3d`, `hermiteG2`, `variableSweep`, `fillet({ continuity: 'G2' })`) → also load `kernelcad-nurbs`.
- Mechanical patterns (linear / circular / grid replication of a sub-feature) → also load `kernelcad-patterns`.
- Folded sheet-metal parts (brackets, channels, panels, bend tables, flat patterns) → also load `kernelcad-sheet-metal`.
- Signed-distance fields (smooth-blended primitives, organic shapes via `sdf.*` + `materialize`) → also load `kernelcad-sdf`.
- Introspecting a running model via MCP (`list_features`, edit ops, diagnostics) → load `kernelcad-mcp` instead of authoring.

## Key globals available today

- `referenceImage(path, opts)` — show a reference photo as a plane overlay in the Studio viewport. No OCCT geometry; hidden during scoring. Supports `.png`, `.jpg`, `.jpeg`, `.webp`. See `kernelcad-authoring` for the full signature.
- `Shape.material(opts)` — apply a PBR material (baseColor, metalness, roughness, clearcoat, clearcoatRoughness, ior, transmission) to a shape. Must be called on leaf parts before they enter a boolean. Use instead of `.color()` when the reference shows gloss or specular highlights. See `kernelcad-authoring` Materials section for idiomatic examples.

## Universal conventions

- **Units**: millimetres, degrees, Z-up right-handed.
- **Return rule**: every `.kcad.ts` script `return`s a single `Shape` (or `Scene` from `assembly().model()`).
- **Diagnostic-anchored hints**: when a kernelCAD tool throws, the error carries a `hint` field tied to a diagnostic code (`feature.*`, `assembly.*`, etc.). Read the hint — it carries the fix.
- **Verification gates**: every authoring skill ends with a `## Verification gates` section. After authoring, walk the relevant gate set before reporting done — render → Read PNGs back → compare to reference. Never rationalize a visible defect (see `kernelcad-from-reference` for the canonical loop).
