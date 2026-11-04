---
id: sheet-metal-edge-flange-hem
title: Sheet-metal edge flange and hem sugar over bend
tags: [sheet-metal, bend, manufacturing]
keywords:
  - edgeFlange hem cornerRelief sheet metal
  - flange length 90 degree bend sugar
  - closed open teardrop hem
  - sheetMetal bend API sugar
when_to_use: >-
  Prompt asks for an edge flange, hem, or corner relief on a sheet-metal blank.
  Prefer `.edgeFlange` / `.hem` sugar (they call `.bend` underneath) instead of
  inventing solid unions. Pass an explicit inner radius. `.cornerRelief` records
  relief intent only in this slice (no new OCCT lowerer yet).
---

```typescript
// 80×40×1.5 mm blank: 90° edge flange on x=40, then a closed hem on the free edge.
// cornerRelief is metadata-only here — call it when docs/DFM should know the relief.
const s = path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close();
const blank = sheetMetal(s, { thickness: 1.5, kFactor: 0.38 });
blank.cornerRelief({ type: 'circular', size: 2 });
const flanged = blank.edgeFlange({ atX: 40 }, { length: 18, angle: 90, radius: 2 });
return flanged.hem({ atY: 0 }, { type: 'closed', length: 5, radius: 1.2 });
```
