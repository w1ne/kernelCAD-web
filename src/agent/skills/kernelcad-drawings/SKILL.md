---
name: kernelcad-drawings
description: Export 2D engineering-drawing sheets (SVG) from any model or assembly — third-angle front/top/left + isometric views with hidden-line removal, automatic dimensions and GD&T derived from the geometry, authored callouts, section views on any plane, and a title block. Use when the deliverable is a human-readable fabrication or review drawing.
---

# kernelCAD — engineering drawings

`export({ target: 'model', format: 'svg-drawing' })` renders a `.kcad.ts` model as a standard third-angle engineering-drawing sheet in SVG. It works on single bodies and on assemblies (`assembly.model()` / `solvedModel(...)`) — assembly parts are projected together in world frame, so one part occluding another renders correctly as hidden lines.

## What the sheet contains

- **Views**: front, top (above front), left (left of front) — third-angle arrangement with shared-axis alignment — plus an isometric pictorial in the upper-right cell. One drawing scale for all views, snapped to the standard series (…, 2:1, 1:1, 1:2, 1:5, …) and stamped in the title block.
- **Line styling** per drafting convention: visible edges solid full-weight; hidden edges dashed half-weight; tangent edges (fillet boundaries, smooth face transitions) thin solid. The isometric view omits hidden lines.
- **Dimensions**: by default the overall bounding box — width (under the front view), height (right of the front view), depth (left of the top view), with extension lines and arrowheads. Values are model millimetres. Turn on `autoAnnotate` (below) to derive datums, hole callouts with position tolerances, hole positions, radii, chamfers, flatness and a general-tolerance note from the geometry, or author your own with `annotations`.
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
- `autoAnnotate`: `true` or `{ tolerance?, datums?, include? }` — automatic dimensioning and GD&T, see below.
- `annotations`: authored dimensions and notes — see below.
- `sections`: cutting-plane section views — see "Section views" below.

```json
{ "options": { "format": "svg-drawing", "sheet": "a3", "modelName": "Clamp body", "date": "2026-06-10" } }
```

## Automatic dimensioning and GD&T — `autoAnnotate`

`options.autoAnnotate: true` reads the exported solid (no feature history needed) and draws a quotable sheet:

```bash
kernelcad export svg-drawing examples/drawings-auto/bracket.kcad.ts -o /tmp/bracket-drawing.svg \
  --options '{"autoAnnotate":true,"sections":[{"plane":{"origin":[45,30,20],"normal":[0.866,0.5,0]},"label":"D"}]}'
```

```
Wrote 55653 bytes to /tmp/bracket-drawing.svg
drawing: 21 annotation(s) placed, 0 overlapped (hole-position 9, overall 3, hole 3, datum 3, flatness 1, fillet 1, chamfer 1, general-tolerance 1)
```

MCP: the same `options` on `export({ target: 'model', format: 'svg-drawing', ... })`; the result carries `drawing_report` (`placed`, `overlapped`, `byKind`, `datums`, and every annotation with its text, view and whether it still collides).

Object form: `{ tolerance?: 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c', datums?: 'auto' | [{ label, face: FaceQuery }], include?: [...] }`. `tolerance` defaults to `ISO2768-m`. `include` picks families from `datums`, `flatness`, `holes`, `hole-positions`, `overall`, `fillets`, `chamfers`, `general-tolerance` (default all). `autoAnnotate` replaces the bounding-box dimensions; it carries its own overall set.

### Rules

| family | rule | example |
| --- | --- | --- |
| datum A | largest planar face; faces within 1 % of it tie, and ties prefer the face whose outward normal is most opposite the counterbore / countersink mouths (the face the part bolts down on), then −Z, −Y, −X | bottom of a plate |
| datum B | largest planar face orthogonal to A; when the part has holes, only faces parallel to the dominant hole axis count (faces a hole pattern is located from); ties prefer the face nearest a hole axis, then −Y, −X, −Z | front edge face |
| datum C | same rule, orthogonal to A and B | left edge face |
| holes | co-axial bores and concave cones chained into simple, counterbored and countersunk holes; identical holes grouped, with a position frame to the datums that exist stacked under the callout | `4× ⌀6.5 THRU` over `⌖ ⌀0.1 A B C`, `⌀5.5 THRU ⌴⌀10 ▾ 3`, `⌀4 THRU ⌵⌀8 × 90°` |
| position zone | ISO 2768-1 permissible deviation of the finest range for the class: f 0.05, m 0.1, c 0.2 | `⌀0.1` |
| hole positions | hole centres dimensioned baseline-style from the datum plane normal to each in-view axis (bounding box when no datum is normal to it); unique coordinates only | `10`, `40`, `70` |
| overall | width under the front view, height right of it, depth left of the top view | `80`, `10`, `50` |
| fillets | partial cylinders and tori that are not hole walls or bosses, grouped by radius per view | `4× R5` |
| chamfers | narrow planar strips between two larger planar faces; legs measured from the corner line the chamfer replaced | `2× 1 × 45°`, `1 × 2` |
| flatness on A | ISO 2768-2 straightness/flatness for the face's longest side, class H / K / L for f / m / c | `⏥ 0.2` |
| general tolerance | cell beside the title block | `ISO 2768-mK` |

Blind hole depth is measured from the entry surface to the end of the full diameter. A bore the rules cannot express (stacked bores, an internal duct, an axis off X/Y/Z) is not dropped: it warns `drawing.auto.hole-unclassified` naming its position, axis and reason. A datum the rules cannot establish (no planar face, nothing orthogonal) warns `drawing.auto.datum-ambiguous`, and frames reference only the datums that exist.

### Placement

Linear dimensions stack on fixed free sides (top view: above and left; front: below and right; left: below and left), 8 mm out and 8 mm per step. Leader callouts — holes, datum symbols, flatness, radii, chamfers — are placed by rendering candidate anchors × angles × stem lengths and testing each label box against drawn geometry, placed labels and leaders, view captions, section indicators and the sheet frame; the cheapest clean candidate wins, with a preference for leaders that cross no lines and labels outside view outlines. Anything that still collides is counted in `overlapped`, marked `overlapped: true` in the report, and named in one `drawing.annotation.overlap` warning. Structured hooks in the SVG: `data-kc-auto="<family>"` on every automatic group, `data-kc-datum="A"`, `data-kc-fcf="⌖ ⌀0.1 A B C"`, `data-kc-count` on hole callouts.

### Declaring datums and tolerances in the script

When a datum or tolerance is design intent rather than a rule outcome, declare it on the shape. Both are declaration-only: they return the same shape and never touch geometry.

```ts
let plate = box(80, 50, 10);
// ... holes ...
plate = plate
  .datum('A', { atZ: 0 })
  .tolerance({ type: 'position', value: 0.05, modifier: '⌀', datums: ['A', 'B', 'C'],
               edge: { ofCurveType: 'CIRCLE', near: [10, 10, 10] } });
return plate;
```

- A declaration counts when it was made on the exported shape or on any shape feeding it, so later booleans on `plate` keep it.
- A declared datum pins that letter to that face; the rules derive the remaining letters around it. `autoAnnotate.datums` does the same from the export side.
- A declared tolerance of type T on a feature replaces the automatic T on that feature. A hole group is one feature: a position tolerance on any rim of a `4×` group replaces the group's frame. A type the automatic set does not carry is stacked under that feature's callout; one that matches no automatic feature gets its own frame.
- Declarations are drawn with or without `autoAnnotate`, and never suppress the bounding-box dimensions.
- Capture-time checks throw `feature.invalid-args`: datum letters are one or two capitals other than I, O, Q and unique per script; `type` is one of the six GD&T types below; `value` is positive; exactly one of `face` / `edge`; `flatness` and `cylindricity` take no datums. A query that misses the exported geometry fails the export with `drawing.datum.unresolved` / `drawing.tolerance.feature-unresolved`.

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

- `plane`: `'xy'` (cuts along Z), `'xz'` (cuts along Y), `'yz'` (cuts along X) — position defaults to the bounding-box midpoint on that axis — or `{ origin: [x,y,z], normal: [nx,ny,nz] }` with any non-zero normal. A zero normal fails with `feature.invalid-args`.
- **Oblique planes** (normal more than ~2.5° off every axis) cut for real too: the kept half is the side opposite the normal, the section cell looks straight along the normal (true shape; screen-up is world Z projected into the plane, or world Y for a near-horizontal plane), and the indicator is the plane's trace on the standard view closest to edge-on. The cell carries `data-kc-section-normal` and `data-kc-cell-scale`.
- The kept half is the far-from-viewer side (the ASME convention — remove the near material, look straight at the cut). An axis-aligned section reuses the standard camera for that axis (`'top'` for an `'xy'` cut, `'front'` for `'xz'`, `'left'` for `'yz'`), so it renders through the same HLR pipeline (visible/hidden/tangent styling) as every other view.
- The true cut cross-section — the face(s) that land exactly on the cutting plane — is filled with a 45° hatch pattern (`fill="url(#kc-section-hatch)"`). A hole the plane slices through renders correctly as a hole in the hatch (outer + inner wire, `fill-rule="evenodd"`), not a solid disk.
- A cutting-plane indicator (dashed line, arrows, the section letter at both ends) is drawn on the "parent" view where the plane appears edge-on (`'front'` for an `'xy'`/`'yz'` cut, `'top'` for an `'xz'` cut, the closest-to-edge-on view for an oblique cut). Pick section letters that are not datum letters.
- A plane that doesn't pass through the body's bounding box fails with `drawing.section.plane-misses-body`.
- The section cell is captioned `SECTION A-A` (from `label`).

## Current limits

- Per-view scale overrides are not available — every view, including section cells, shares one drawing scale (a section cell may use a SMALLER local scale than the main views if it wouldn't otherwise fit the reserved band, but never a larger one).
- `autoAnnotate` is built for single parts. On an assembly it treats the compound as one body, so datums and hole groups span parts.
- Datums are planar faces only; a turned part with no planar faces orthogonal to its end face gets A and a `drawing.auto.datum-ambiguous` warning, not a cylindrical datum axis.
- Automatic hole callouts cover bores along X, Y or Z. Threads are not modelled, so a tapped hole reads as its pilot diameter.
- Position frames reference A B C in that order whatever the hole axis; declare a tolerance with its own datum order when a hole is located from a different primary.
- Tolerance values follow the ISO 2768 tables described above; fit-critical features need a declared tolerance.
- The authored `chamfer` annotation's leg `size` is author-supplied (the automatic chamfer callout measures legs from the geometry).
- Placement is greedy and one-pass; a dense part on a4 can still report overlaps. Use `sheet: 'a3'`, narrow `include`, or author the crowded callouts.
- `drawing.annotation.overlap` is a REAL, non-fatal check: after rendering, every axis-aligned `<text>` label's approximate bounding box (rotated labels — the vertical `linear` dimension — are skipped, not estimated) is compared pairwise across DIFFERENT annotations. An overlapping pair does not fail the export (a crowded callout is still more useful than a silently dropped one); it emits one `warn` diagnostic naming every overlapping pair. Use `offset`, a different `view`, or reorder the array to separate them. The shared leader-rotation stacking (every leader-based kind — `radius`/`diameter`/`note`/`hole`/`fillet`/`chamfer`/`datum`/`fcf`) already fans successive callouts on the same view apart, which covers the common case; the overlap check is the backstop for when it isn't enough.
- Dimensions are derived from the exported geometry, authored, or bounding-box; they are not bound to `param()` names.
- Hidden tangent edges are intentionally omitted (noise, no contour information).
- Partially overlapping collinear duplicates are kept; only exactly coincident segments deduplicate.

## Verify before shipping

Render the SVG to PNG and look at it (e.g. `google-chrome --headless --screenshot=sheet.png file://…/drawing.svg`). Check: hidden bores dashed where expected, tangent fillet lines thin, views aligned, dimensions match the model's bbox, title block populated. A drawing with a wrong or unreadable view is not done even if the export succeeded.
