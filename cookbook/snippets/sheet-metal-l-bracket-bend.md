---
id: sheet-metal-l-bracket-bend
title: Sheet-metal L-bracket from flat blank with one 90-degree bend
tags: [sheet-metal, bend, bracket, plate, parameter, manufacturing]
keywords:
  - sheet metal L-bracket
  - fold along x bend radius K-factor
  - flattenPattern flat blank laser
  - 100x60x2 mm 90 degree fold
  - sheetMetal bend not solid union plates
  - service panel flange bend approx
  - bent sheet metal bracket with flat pattern DXF for laser cutting
  - folded 5052 aluminium or steel sheet, inner bend radius, bend allowance
  - do not fake bends by unioning plates
when_to_use: >-
  Prompt asks for a folded sheet-metal L-bracket, U-channel, flange, or service
  panel from a flat blank. Use `sheetMetal(profile, { thickness, kFactor })` then
  `.bend(...)` — not a solid union of two plates — when fabrication intent is
  sheet + folds. Blank corners may be arcs (`radiusArc`, `tangentArc`, ...): the
  flat pattern samples them within 0.005 mm. After evaluate/lower, recover the
  blank with `flattenPattern()` (MCP `flatten_pattern` / inspect bend-table) for
  laser/CNC.
---

```typescript
// L-bracket: 100 x 60 x 2 mm, one 90° fold along x=50, inner radius 3 mm.
// flattenPattern() needs a lowered Shape — call it after evaluate via MCP
// flatten_pattern / inspect({ of: 'bend-table' }), not inline in the script body.
const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
let blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
// Cut holes before .bend() so they unfold exactly onto the flange they land on.
blank = blank.holes({ byNormal: 'Z' }, { positions: [{ u: -25, v: 0 }], diameter: 5, depth: 'through' });
return blank.bend({ atX: 50 }, 90, 3);
```

A laser blank usually has rounded corners. Arc segments fold like lines and the
flat pattern keeps them: the profile may call `radiusArc`, `sagittaArc`,
`bulgeArc`, `tangentArc` or `threePointsArc` between its `lineTo` runs, and
`flattenPattern()` samples those arcs into the `Region` polyline at a 0.005 mm
chord sagitta (an R10 corner loses under 0.25 mm² of area). For example, four
`R10` corners on the 100 x 60 blank use `.moveTo(10, 0).lineTo(90, 0)` then
`.tangentArc(100, 10).lineTo(100, 50)` and the matching three corners before
`.close()`. Ellipse and spline segments are refused by name rather than
straightened.

A cut made after `.bend()` reaches the flat pattern only when it opens the
still-flat base; the folded solid's flat top face supplies its outline. A cut
on a folded flange has no XY projection, so `flatten_pattern` and DXF export
refuse with `feature.flattenPattern.post-bend-geometry` instead of writing a
blank sheet without it.
