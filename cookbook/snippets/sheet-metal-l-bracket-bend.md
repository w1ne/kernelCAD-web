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
when_to_use: >-
  Prompt asks for a folded sheet-metal L-bracket, U-channel, flange, or service
  panel from a flat blank. Use `sheetMetal(profile, { thickness, kFactor })` then
  `.bend(...)` — not a solid union of two plates — when fabrication intent is
  sheet + folds. After evaluate/lower, recover the blank with `flattenPattern()`
  (MCP `flatten_pattern` / inspect bend-table) for laser/CNC.
---

```typescript
// L-bracket: 100 x 60 x 2 mm, one 90° fold along x=50, inner radius 3 mm.
// flattenPattern() needs a lowered Shape — call it after evaluate via MCP
// flatten_pattern / inspect({ of: 'bend-table' }), not inline in the script body.
const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
return blank.bend({ atX: 50 }, 90, 3);
```
