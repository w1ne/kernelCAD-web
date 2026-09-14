---
name: kernelcad-drawings
description: Export 2D engineering-drawing sheets (SVG) from any model or assembly — third-angle front/top/left + isometric views with hidden-line removal, overall dimensions, and a title block. Use when the deliverable is a human-readable fabrication or review drawing.
---

# kernelCAD — engineering drawings

`export({ target: 'model', format: 'svg-drawing' })` renders a `.kcad.ts` model as a standard third-angle engineering-drawing sheet in SVG. It works on single bodies and on assemblies (`assembly.model()` / `solvedModel(...)`) — assembly parts are projected together in world frame, so one part occluding another renders correctly as hidden lines.

## What the sheet contains

- **Views**: front, top (above front), left (left of front) — third-angle arrangement with shared-axis alignment — plus an isometric pictorial in the upper-right cell. One drawing scale for all views, snapped to the standard series (…, 2:1, 1:1, 1:2, 1:5, …) and stamped in the title block.
- **Line styling** per drafting convention: visible edges solid full-weight; hidden edges dashed half-weight; tangent edges (fillet boundaries, smooth face transitions) thin solid. The isometric view omits hidden lines.
- **Dimensions**: by default the overall bounding box — width (under the front view), height (right of the front view), depth (left of the top view), with extension lines and arrowheads. Values are model millimetres. Author your own with `annotations` (below) to dimension actual features instead.
- **Title block**: model name, scale, units (mm), date, and the third-angle projection symbol.
- Coincident projected segments (e.g. a bore's front and back rim landing on the same arc) are deduplicated visible-first — nothing renders twice or dashed underneath a solid line.

## Quickstart

MCP:

```json
{ "tool": "export", "input": { "target": "model", "file": "bracket.kcad.ts", "format": "svg-drawing", "output_path": "out/bracket-drawing.svg" } }
```

CLI:

```bash
kernelcad export svg-drawing bracket.kcad.ts -o out/bracket-drawing.svg
```

## Options

Pass via `options` (MCP) — all optional:

- `sheet`: `'a4'` (default, 297×210 landscape) or `'a3'` (420×297).
- `modelName`: title-block name; defaults to the script's file name.
- `date`: title-block date string; defaults to a placeholder so output stays byte-deterministic (stamp an ISO date when the drawing is released).
- `annotations`: authored dimensions and notes — see below.
- `sections`: cutting-plane section views — see "Section views" below.

```json
{ "options": { "format": "svg-drawing", "sheet": "a3", "modelName": "Clamp body", "date": "2026-06-10" } }
```

## Annotations — dimensioning what you actually care about

The automatic dimensions can only ever state the overall bounding box. `annotations` is how you say *dimension THIS hole*. **Supplying any annotation replaces the bounding-box dimensions** — a sheet carrying both would double-dimension the outline.

Every entry shares four optional fields: `view` (`front` default, or `top` / `left` / `iso`), `text` (override the computed label), and `offset` (extra sheet-millimetres pushing the annotation further from the geometry). The rest is per `kind`:

| `kind` | geometry | label |
| --- | --- | --- |
| `linear` | `from`, `to` anchors, optional `tol` | distance along the dominant view axis, optionally `± 0.1` / `+0.2/−0.05` / `H7` |
| `radius` | `edge` (an EdgeQuery selecting a circular edge) | `R<r>` |
| `diameter` | `edge` (ditto) | `⌀<d>` |
| `angular` | `from`, `to` EdgeQueries — the apex is where the two edges cross in that view | `<deg>°` |
| `note` | `at` anchor + required `text` | your text, on a leader |
| `hole` | `edge` (rim), one of `through: true` / `depth`, optional `counterbore`/`countersink`/`count` | `⌀6.5 THRU`, blind `⌀6.5 ▾ 10`, `⌴⌀12 ▾ 4` / `⌵⌀12 × 90°` suffixes, `4× ` pattern prefix |
| `fillet` | `edge` (a circular fillet boundary arc) | `R<r>` |
| `chamfer` | `edge` (anchor) + required `size`, optional `angleDeg` (default 45) | `<size> × <angle>°` |
| `datum` | `face` (a FaceQuery) + required `label` | ASME square datum-feature symbol with the letter |
| `fcf` | one of `edge`/`face` + `type` (`position`\|`flatness`\|`perpendicularity`\|`parallelism`\|`concentricity`\|`cylindricity`) + `value`, optional `datums`/`modifier` | feature control frame: type symbol · value(±modifier) · datum letters |

`chamfer`'s `size` is author-supplied rather than measured — a bare edge query carries no feature history, so the chamfer leg length isn't recoverable from geometry alone at export time. `hole` requires exactly one of `through`/`depth` — the export fails loudly (naming the annotation) if both or neither are set, same honesty contract as every other annotation kind.

```json
{ "kind": "hole", "view": "top", "edge": { "ofCurveType": "CIRCLE", "near": [10, 10, 0] }, "through": true, "counterbore": { "diameter": 12, "depth": 4 } }
{ "kind": "fcf", "view": "top", "edge": { "ofCurveType": "CIRCLE", "near": [70, 40, 0] }, "type": "position", "value": 0.1, "datums": ["A"], "modifier": "⌀" }
```

An **anchor** is an explicit model point `[x, y, z]`, `{ edge: EdgeQuery }` (resolves to the edge's curve midpoint), or `{ face: FaceQuery }` (resolves to the face centre) — the same selector vocabulary `fillet` / `chamfer` / `selectEdge` use.

```json
{
  "options": {
    "format": "svg-drawing",
    "annotations": [
      { "kind": "linear", "from": [0, 0, 0], "to": [60, 0, 0] },
      { "kind": "linear", "from": { "face": { "atZ": 0 } }, "to": { "face": { "atZ": 10 } } },
      { "kind": "diameter", "view": "top", "edge": { "ofCurveType": "CIRCLE", "atZ": 10 } },
      { "kind": "angular",
        "from": { "ofCurveType": "LINE", "near": [20, 0, 0], "within": { "zMin": -0.5, "zMax": 0.5 } },
        "to":   { "ofCurveType": "LINE", "near": [0, 0, 15], "within": { "xMin": -0.5, "xMax": 0.5 } } },
      { "kind": "note", "at": { "face": { "atZ": 10 } }, "text": "BREAK ALL EDGES 0.5" }
    ]
  }
}
```

### Placement rules

- **Anchoring is in model space.** Anchors resolve to 3D model points and are pushed through the same projection + sheet transform as the geometry, so a dimension stays welded to its feature when the drawing scale changes.
- **Text and leaders are sheet-constant.** Label height, arrowheads, leader stems and dimension-line spacing are fixed sheet millimetres at every scale — only positions scale.
- **Stacking is deterministic and author-ordered.** Annotations bucket by (view, side): a `linear` whose projected span is wider than tall goes *below* its view, otherwise *right* of it. Within a bucket the first sits 8 mm out and each further one steps 8 mm further; angular arcs grow by 8 mm; leaders rotate 30° per leader. Reordering the model cannot reshuffle the sheet — only reordering the array can. View captions move down automatically to clear whatever stacks beneath them.

### Failure behaviour

An annotation whose query matches **zero** edges/faces, matches **more than one** without a `near` disambiguator, asks for a radius on a non-circular edge, or measures an angle between edges that are parallel in that view, **fails the export** with a `feature.selection.no-match` diagnostic naming `annotations[i]` and the reason. All failures are reported at once. Nothing is silently dropped: a drawing that quietly omits a dimension you asked for is worse than one that errors.

## Conventions and behaviour

- Model space is mm, z-up; the front view looks along +y (model front faces −y), matching the canonical render pose.
- The SVG is structured for downstream tooling: `<g id="view-front|top|left|iso">` per view with `class="visible|hidden|tangent"` subgroups, `data-kc-scale` / `data-kc-units` on the root element.
- Curved edges are sampled to polylines at 0.02 mm chord tolerance — invisible at print scale.
- A drawing is a derived artifact, not source-of-truth: change the `.kcad.ts`, re-export.

## Section views

`options.sections: [{ plane, label }]` cuts the assembled body with a real half-space boolean (not a render-time visual clip) and adds a section-view cell below the standard 4-view grid — the sheet grows taller to make room; the standard views are pixel-for-pixel unaffected.

```json
{
  "options": {
    "format": "svg-drawing",
    "sections": [{ "plane": "xy", "label": "A" }]
  }
}
```

- `plane`: `'xy'` (cuts along Z), `'xz'` (cuts along Y), `'yz'` (cuts along X) — position defaults to the bounding-box midpoint on that axis — or `{ origin: [x,y,z], normal: [nx,ny,nz] }` for an explicit position. **Only axis-aligned normals are supported** (within ~2.5° of ±X/±Y/±Z); an oblique plane fails with `feature.invalid-args` rather than being approximated.
- The kept half is the far-from-viewer side (the ASME convention — remove the near material, look straight at the cut). The section view reuses the standard camera for that axis (`'top'` for an `'xy'` cut, `'front'` for `'xz'`, `'left'` for `'yz'`), so it renders through the same HLR pipeline (visible/hidden/tangent styling) as every other view.
- The true cut cross-section — the face(s) that land exactly on the cutting plane — is filled with a 45° hatch pattern (`fill="url(#kc-section-hatch)"`). A hole the plane slices through renders correctly as a hole in the hatch (outer + inner wire, `fill-rule="evenodd"`), not a solid disk.
- A cutting-plane indicator (dashed line, arrows, the section letter at both ends) is drawn on the "parent" view where the plane appears edge-on (`'front'` for an `'xy'`/`'yz'` cut, `'top'` for an `'xz'` cut).
- A plane that doesn't pass through the body's bounding box fails with `drawing.section.plane-misses-body`.
- The section cell is captioned `SECTION A-A` (from `label`).

## Current limits

- Per-view scale overrides are not available — every view, including section cells, shares one drawing scale (a section cell may use a SMALLER local scale than the main views if it wouldn't otherwise fit the reserved band, but never a larger one).
- GD&T (`datum`/`fcf`) and the `hole`/`fillet`/`chamfer` callouts are authored through `options.annotations`, the same surface as every other dimension — there is no `Shape.datum()` / `Shape.tolerance()` capture-graph method. That would need a new capture-graph `FeatureKind` + OCCT lowerer + a way for the lowered `WorldFramePart` (which today carries only the final geometry, not feature records) to reach the exporter — a bigger change than adding an export-time annotation kind, and out of scope for this slice.
- `chamfer`'s leg `size` is author-supplied — not recoverable from a bare edge query without feature history.
- Section planes must be axis-aligned; an oblique `{ origin, normal }` fails loudly rather than being approximated (see "Section views" above).
- `drawing.annotation.overlap` is a REAL, non-fatal check: after rendering, every axis-aligned `<text>` label's approximate bounding box (rotated labels — the vertical `linear` dimension — are skipped, not estimated) is compared pairwise across DIFFERENT annotations. An overlapping pair does not fail the export (a crowded callout is still more useful than a silently dropped one); it emits one `warn` diagnostic naming every overlapping pair. Use `offset`, a different `view`, or reorder the array to separate them. The shared leader-rotation stacking (every leader-based kind — `radius`/`diameter`/`note`/`hole`/`fillet`/`chamfer`/`datum`/`fcf`) already fans successive callouts on the same view apart, which covers the common case; the overlap check is the backstop for when it isn't enough.
- Dimensions are authored or bounding-box; they do NOT auto-update from `param()` values.
- Hidden tangent edges are intentionally omitted (noise, no contour information).
- Partially overlapping collinear duplicates are kept; only exactly coincident segments deduplicate.

## Verify before shipping

Render the SVG to PNG and look at it (e.g. `google-chrome --headless --screenshot=sheet.png file://…/drawing.svg`). Check: hidden bores dashed where expected, tangent fillet lines thin, views aligned, dimensions match the model's bbox, title block populated. A drawing with a wrong or unreadable view is not done even if the export succeeded.
