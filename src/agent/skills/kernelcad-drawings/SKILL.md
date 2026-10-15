---
name: kernelcad-drawings
description: Export 2D engineering-drawing sheets (SVG, or a printable PDF on a standard sheet) from any model or assembly — third-angle front/top/left + isometric views with hidden-line removal, overall dimensions, and a title block. Use when the deliverable is a human-readable fabrication or review drawing.
---

# kernelCAD — engineering drawings

`export({ target: 'model', format: 'svg-drawing' })` renders a `.kcad.ts` model as a standard third-angle engineering-drawing sheet in SVG. It works on single bodies and on assemblies (`assembly.model()` / `solvedModel(...)`) — assembly parts are projected together in world frame, so one part occluding another renders correctly as hidden lines.

## What the sheet contains

- **Views**: front, top (above front), left (left of front) — third-angle arrangement with shared-axis alignment — plus an isometric pictorial in the upper-right cell. One drawing scale for all views, snapped to the standard series (…, 2:1, 1:1, 1:2, 1:5, …) and stamped in the title block.
- **Line styling** per drafting convention: visible edges solid full-weight; hidden edges dashed half-weight; tangent edges (fillet boundaries, smooth face transitions) thin solid. The isometric view omits hidden lines.
- **Dimensions**: by default the overall bounding box — width (under the front view), height (right of the front view), depth (left of the top view), with extension lines and arrowheads. Values are model millimetres. Author your own with `annotations` (below) to dimension actual features instead.
- **Title block**: model name, scale, units (mm), date, and the third-angle projection symbol.
- Coincident projected segments (e.g. a bore's front and back rim landing on the same arc) are deduplicated visible-first — nothing renders twice or dashed underneath a solid line.

## PDF sheet for the shop

`format: 'pdf-drawing'` writes the same sheet as a vector PDF ready to print or send: the views, hidden lines, dimensions, hole callouts and GD&T are the SVG sheet's, transcribed page for page. It adds a standard sheet and a full title block:

- **Sheet**: `sheet` is `'a4'` `'a3'` (default) `'a2'` `'a1'` `'a0'` or `'ansi-a'` … `'ansi-e'`, always landscape; `'auto'` / `'auto-ansi'` pick the smallest sheet that holds the views at 1:1, else the largest one with a reduced scale. The scale is snapped to the standard series and printed in the title block. Section views take room inside the sheet instead of growing the page.
- **Projection**: `projection: 'third'` (default) or `'first'`. First angle puts the top view below the front view, the left view right of it, the isometric lower-left, and draws the first-angle symbol; automatic dimensions move to each view's free side.
- **Title block**: TITLE (`title`, default the model name), PART NAME (`partName`), MATERIAL (`material`, default the shared material of the assembly parts), REV (`revision`), SCALE, UNITS, SHEET size, DATE (`date`, default today). Unset fields print `—`. The DATE cell also carries a small "Made with kernelCAD · kernelcad.com" line, a clickable link in the PDF; the PDF Producer is the kernelCAD version.
- **Annotations**: `autoAnnotate` is on unless you pass `annotations`; pass `autoAnnotate: false` for the overall bounding-box dimensions only.

```json
{ "tool": "export", "input": { "target": "model", "file": "bracket.kcad.ts", "format": "pdf-drawing", "output_path": "out/bracket.pdf",
  "options": { "format": "pdf-drawing", "title": "L mounting bracket", "partName": "BRK-001", "material": "AlMg3", "revision": "B" } } }
```

```bash
kernelcad export pdf-drawing bracket.kcad.ts -o out/bracket.pdf --title "L mounting bracket" --revision B --material AlMg3 --sheet a3
```

Text is set in the standard Helvetica face, so the PDF needs no embedded font; `⌀` prints as `Ø`, and the GD&T and hole symbols (⌖ ⏥ ⟂ ∥ ⌴ ⌵ ↧ …) are drawn as vector strokes.

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

If `options` is supplied, its `format` must equal the top-level `format`:
`{ format: 'svg-drawing', options: { format: 'svg-drawing', sheet: 'a3' } }`.
Omitting `options.format` fails with `export.options-format-mismatch`.
Inspect the exported artifact rather than assuming an unknown option was
honoured. In particular, confirm the actual view count for a front-view-only
request; the default sheet contains four views.

- `sheet`: `'a4'` (default, 297×210 landscape), `'a3'` (420×297), or any `pdf-drawing` size (`'a2'` … `'ansi-e'`, `'auto'`).
- `views: ['front']`: a single centred front elevation with width/height dimensions. Omit `views` for the default four-view sheet. Author front-view annotations explicitly for feature dimensions. A front-only drawing rejects annotations assigned to absent views and isometric-only balloons or exploded overlays.
- `projection`: `'third'` (default) or `'first'` — see "PDF sheet for the shop".
- `titleBlock`: `{ title?, partName?, material?, revision? }` — switches to the full title block the PDF sheet uses.
- `modelName`: title-block name; defaults to the script's file name.
- `date`: title-block date string; defaults to a placeholder so output stays byte-deterministic (stamp an ISO date when the drawing is released).
- `annotations`: authored dimensions and notes — see below.
- `sections`: cutting-plane section views — see "Section views" below.
- `exploded`: `{ factor, mode }` — explode the isometric cell (`mode` is `mate-axis` or `radial`). Ortho views stay assembled.
- `balloons`: item balloons on the isometric cell; numbers match BOM item numbers from `inspect({ of: 'bom' })`.
- `partsList`: parts-list table (item, name, qty, material) above the title block, from the same BOM rows.

```json
{ "options": { "format": "svg-drawing", "sheet": "a3", "modelName": "Clamp body", "date": "2026-06-10" } }
```

## Declared functional review

Declare `.dimension({ id: 'width', kind: 'linear', from: [0,0,0], to: [80,0,0] })`
and `.drawingReview({ id: 'mount', requirements: [{ id: 'width', featureId: 'plate interface',
annotationId: 'authored:width', expectedKind: 'linear', role: 'critical', reason: 'Mating width' }], decisions: [] })`
on the source shape. Plans follow that shape into downstream exports and add no geometry.
`featureId` describes engineering intent; it is not a topology reference.

Mechanical SVG/PDF options support `reviewPlans` (additional plans, merged with source plans),
`decisionResolutions` and `requireCompleteReview`. A plan needs nonempty `id`, both arrays,
and at least one requirement or decision. Unknown fields and duplicate IDs reject.
Each requirement targets an exact authored ID and measurable kind: `linear`, `diameter`,
`radius` or `angular`. Notes, datum symbols and automatic rows cannot satisfy it.

`drawing_report.review` / runtime `drawingReport.review` contains `status`, `requirements`,
`decisions`, `criticalCount`, `coveredCriticalCount`, `decisionCount` and `unresolvedDecisionCount`.
Requirements include plan/requirement IDs, feature, reason, annotation ID, expected kind, role
and `missing`, `ambiguous`, `kind-mismatch`, `hidden`, `crowded`, `label-overridden` or `covered`
status. Failed reference requirements are advisories. Failed critical requirements and every
unresolved decision block `complete`; no plan means `not-declared`.

Decisions declare `{ id, kind: 'datum'|'fit'|'tolerance'|'dimension'|'other', featureId, prompt,
resolution?: { note, provenance } }`. To override a source decision resolution, use
`decisionResolutions: { [drawingDecisionKey(planId, decisionId)]: { note, provenance } }`;
the key is `encodeURIComponent(planId) + ':' + encodeURIComponent(decisionId)`.
Both resolution strings must be nonempty; unknown keys and malformed overrides reject.
A resolution records intent/provenance only; it does not create geometry or GD&T.

Review evaluates final rendered rows after suppression and layout. A manual critical text
replacement blocks coverage; restore the computed label or revise the source declaration.
`requireCompleteReview: true` refuses incomplete and undeclared exports. Ordinary exports
remain available with truthful incomplete reports/warnings. Printable SVG (`pdfSheet: true`)
and PDF use the same review report. Architectural style rejects supplied review contracts.
Declared geometric callout coverage does not certify physical fit, tolerances or manufacture.

## Annotations — dimensioning what you actually care about

Without `autoAnnotate`, the default dimensions state the overall bounding box. `autoAnnotate: true` derives feature callouts and positions from the B-rep. `annotations` lets you select exact features and declare the dimensions you need. Supplying authored annotations replaces the default bounding-box dimensions; automatic annotations can be requested separately.

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

- `plane`: `'xy'` (cuts along Z), `'xz'` (cuts along Y), `'yz'` (cuts along X) — position defaults to the bounding-box midpoint on that axis — or `{ origin: [x,y,z], normal: [nx,ny,nz] }` for an explicit position. Any non-zero normal is supported; oblique cuts get an auxiliary view looking straight at the cut.
- The kept half is the far-from-viewer side (the ASME convention — remove the near material, look straight at the cut). The section view reuses the standard camera for that axis (`'top'` for an `'xy'` cut, `'front'` for `'xz'`, `'left'` for `'yz'`), so it renders through the same HLR pipeline (visible/hidden/tangent styling) as every other view.
- The true cut cross-section — the face(s) that land exactly on the cutting plane — is filled with a 45° hatch pattern (`fill="url(#kc-section-hatch)"`). A hole the plane slices through renders correctly as a hole in the hatch (outer + inner wire, `fill-rule="evenodd"`), not a solid disk.
- A cutting-plane indicator (dashed line, arrows, the section letter at both ends) is drawn on the "parent" view where the plane appears edge-on (`'front'` for an `'xy'`/`'yz'` cut, `'top'` for an `'xz'` cut).
- A plane that doesn't pass through the body's bounding box fails with `drawing.section.plane-misses-body`.
- The section cell is captioned `SECTION A-A` (from `label`).

## Architectural floor plans

A building or room model drawn with the default (mechanical) style gets part
annotations — datums, flatness, ISO 2768 — that mean nothing on a floor plan,
and the export warns `drawing.style.architectural-suggested`. Pass
`style: 'architectural'` (svg-drawing or pdf-drawing) for a plan instead:

```json
{ "options": { "format": "pdf-drawing", "style": "architectural", "title": "Cabin",
  "plan": { "rooms": [{ "name": "Living", "at": [1000, 1000] }], "northDeg": 30 } } }
```

- The whole model is fused and cut 1 m (3'-6" imperial) above the finished floor — the top of the largest upward face in the bottom quarter of the model, else its lowest point. `plan.cutHeight` (mm above the floor) moves the cut.
- Cut walls are filled; everything below the cut (sills, floor edges) is drawn thin from above. Openings at the cut height (doors, windows with a sill below the cut) are gaps.
- Dimensions: a chain of wall and opening widths along each exterior side (read just inside the outermost wall face), plus the overall length and width.
- Rooms are the enclosed floor regions of a section. Door openings join rooms at the cut height, so rooms are read from whichever section (the cut, or 2.0–2.5 m above the floor, above the door heads) encloses the most. Each gets its name (the room containing `plan.rooms[i].at`, else `ROOM n`) and net area (m², or ft²).
- Units: millimetres, or feet-inches (to 1/4") when the model's overall size and wall height are whole feet / inches. Force with `plan.units: 'metric' | 'imperial'`. The scale is the largest architectural scale that fits (1:20 … 1:2000, or 1/2" … 1/32" = 1'-0"); `sheet: 'auto'` picks the smallest sheet that holds 1:100 (1/8" = 1'-0").
- A scale bar, a north arrow (`plan.northDeg`, clockwise from sheet up) and a title block (title, scale, units, sheet, date, revision) complete the sheet. The mechanical-only keys (`annotations`, `sections`, `autoAnnotate`, `exploded`, `balloons`, `partsList`) do not apply.

## Drafting profiles and annotation review

Both drawing formats accept `draftingProfile: 'general' | 'machining' | 'sheet-metal'`, or a JSON profile with `id`, `name`, and optional `sheet`, `projection`, `dimensioningStyle`, `tolerance`, and `notes`. Omitted custom settings default to A4, third angle, and baseline. Explicit export settings take precedence. Named presets supply drafting preferences, not a certified process or approved engineering tolerance; the existing automatic tolerance defaults still apply unless you set them.

`autoAnnotate.dimensioningStyle` selects `baseline`, `chain`, or `symmetry`. Baseline locations share a datum origin; chain locations measure consecutive positions; symmetry dimensions verified mirrored positions from a center cue and falls back to baseline for asymmetric layouts. Explicit `autoAnnotate.datums: [{ label, face }]` overrides heuristic automatic datum selection. Script declarations such as `shape.datum('A', { atZ: 0 })` and `shape.tolerance({ type: 'flatness', value: 0.1, face: { atZ: 0 } })` capture design intent rather than guessing it from geometry.

The export result carries `drawing_report.annotations` with deterministic `id`, `source`, `kind`, `view`, `text`, and overlap status. SVG annotation groups expose `data-kc-annotation-id`. Apply edits with:

```json
{ "annotationOverrides": { "<id from drawing_report>": { "suppress": false, "text": "4 × Ø9 THRU", "view": "top", "offset": 8 } } }
```

`offset` is extra nonnegative sheet millimetres, not an X/Y translation. A primary-label edit preserves its attached feature-control frame and declared dimensional tolerance suffix. The report's optional `primaryText` separates the editable label from that suffix. Datum and standalone tolerance/frame text must be changed in the source declaration. A measurement view override must preserve the original dimension or included angle; foreshortened views fail. Suppressed rows remain in the report, excluded from visible and overlap totals. IDs do not depend on placement order; geometry changes can invalidate them and missing IDs produce `drawing.annotation.override-missing`. Authored annotations can set an explicit `id`.

Studio opens drawing review from Export → Drawing PDF: preview the SVG, inspect the annotation list, keep/hide a row, edit permitted labels, change its view/offset, select or save a profile, and export the PDF using those same settings. Choices are browser-local and tied to the exact source; a source change omits stale annotation and datum overrides. See [the worked drafting examples](../../../../docs/guide/drafting-review.md) and `examples/drafting-review/` for runnable models, generated sheets and reproduction instructions.

## Current limits

- Per-view scale overrides are not available — every view, including section cells, shares one drawing scale (a section cell may use a SMALLER local scale than the main views if it wouldn't otherwise fit the reserved band, but never a larger one).
- GD&T intent can be declared with `Shape.datum()` / `Shape.tolerance()` or authored through `options.annotations`. Automatic datum selection is a geometry heuristic; review it against the intended setup and assembly interfaces.
- `chamfer`'s leg `size` is author-supplied — not recoverable from a bare edge query without feature history.
- Exploded isometric + balloons: pass `exploded` plus `balloons` / `partsList`. A script that is not an `assembly()` fails explode with `render.explode.no-assembly`; balloons without a BOM warn `drawing.balloons.bom-unavailable`. Balloon and table labels share the existing overlap check.
- `drawing.annotation.overlap` is a REAL, non-fatal check: after rendering, every axis-aligned `<text>` label's approximate bounding box (rotated labels — the vertical `linear` dimension — are skipped, not estimated) is compared pairwise across DIFFERENT annotations. An overlapping pair does not fail the export (a crowded callout is still more useful than a silently dropped one); it emits one `warn` diagnostic naming every overlapping pair. Use `offset`, a different `view`, or reorder the array to separate them. The shared leader-rotation stacking (every leader-based kind — `radius`/`diameter`/`note`/`hole`/`fillet`/`chamfer`/`datum`/`fcf`) already fans successive callouts on the same view apart, which covers the common case; the overlap check is the backstop for when it isn't enough.
- Re-export after changing parameters: dimensions and resolved feature anchors are derived from the new geometry. Reviewed IDs that no longer match need another review.
- Hidden tangent edges are intentionally omitted (noise, no contour information).
- Partially overlapping collinear duplicates are kept; only exactly coincident segments deduplicate.

## Reading a drawing back

`drawing_to_cad` is the reverse direction: it reads a vector drawing PDF (this
exporter's sheets included) and rebuilds an editable `.kcad.ts` with an
assumption ledger, then re-projects the result through the same view stage to
check it. See `kernelcad-from-reference` § Engineering drawing PDF.

## Verify before shipping

Rasterize the SVG to PNG and inspect it. For browser checks, first attach to an existing Chrome/Chromium session and reuse its profile. Check hidden bores, tangent fillet lines, view alignment, dimensions, sections and title block. Read `drawing_report` and diagnostics, and resolve overlaps before release. A successful export alone does not establish engineering or manufacturing acceptance.
