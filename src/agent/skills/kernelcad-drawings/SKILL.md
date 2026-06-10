---
name: kernelcad-drawings
description: Export 2D engineering-drawing sheets (SVG) from any model or assembly — third-angle front/top/left + isometric views with hidden-line removal, overall dimensions, and a title block. Use when the deliverable is a human-readable fabrication or review drawing.
---

# kernelCAD — engineering drawings

`export_model({ format: 'svg-drawing' })` renders a `.kcad.ts` model as a standard third-angle engineering-drawing sheet in SVG. It works on single bodies and on assemblies (`assembly.model()` / `solvedModel(...)`) — assembly parts are projected together in world frame, so one part occluding another renders correctly as hidden lines.

## What the sheet contains

- **Views**: front, top (above front), left (left of front) — third-angle arrangement with shared-axis alignment — plus an isometric pictorial in the upper-right cell. One drawing scale for all views, snapped to the standard series (…, 2:1, 1:1, 1:2, 1:5, …) and stamped in the title block.
- **Line styling** per drafting convention: visible edges solid full-weight; hidden edges dashed half-weight; tangent edges (fillet boundaries, smooth face transitions) thin solid. The isometric view omits hidden lines.
- **Overall dimensions**: bounding-box width (under the front view), height (right of the front view), and depth (left of the top view), with extension lines and arrowheads. Values are model millimetres.
- **Title block**: model name, scale, units (mm), date, and the third-angle projection symbol.
- Coincident projected segments (e.g. a bore's front and back rim landing on the same arc) are deduplicated visible-first — nothing renders twice or dashed underneath a solid line.

## Quickstart

MCP:

```json
{ "tool": "export_model", "input": { "file": "bracket.kcad.ts", "format": "svg-drawing", "output_path": "out/bracket-drawing.svg" } }
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

```json
{ "options": { "format": "svg-drawing", "sheet": "a3", "modelName": "Clamp body", "date": "2026-06-10" } }
```

## Conventions and behaviour

- Model space is mm, z-up; the front view looks along +y (model front faces −y), matching the canonical render pose.
- The SVG is structured for downstream tooling: `<g id="view-front|top|left|iso">` per view with `class="visible|hidden|tangent"` subgroups, `data-kc-scale` / `data-kc-units` on the root element.
- Curved edges are sampled to polylines at 0.02 mm chord tolerance — invisible at print scale.
- A drawing is a derived artifact, not source-of-truth: change the `.kcad.ts`, re-export.

## Current limits

- Dimensions are overall bounding-box extents only. Feature-level dimensioning (hole callouts, param-bound dimensions), section views, and per-view scale overrides are not available yet.
- Hidden tangent edges are intentionally omitted (noise, no contour information).
- Partially overlapping collinear duplicates are kept; only exactly coincident segments deduplicate.

## Verify before shipping

Render the SVG to PNG and look at it (e.g. `google-chrome --headless --screenshot=sheet.png file://…/drawing.svg`). Check: hidden bores dashed where expected, tangent fillet lines thin, views aligned, dimensions match the model's bbox, title block populated. A drawing with a wrong or unreadable view is not done even if the export succeeded.
