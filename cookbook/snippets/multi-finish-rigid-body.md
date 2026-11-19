---
id: multi-finish-rigid-body
title: One rigid body, several finishes (dark case, metal horn, steel screws)
tags: [union, material, render, export]
keywords:
  - several colours on one part
  - multi colour single body
  - finish per member union
  - servo case dark horn metal screws steel
  - one assembly part per colour
  - union loses material
  - colour lost after union
  - glb one material per finish
when_to_use: >-
  One rigid body needs more than one finish or colour (a servo with a dark
  case, aluminium horn and steel screw heads; a knob with a metal insert).
  Finish each member, then union() them: every member keeps its finish on the
  faces it contributed in Studio, render_preview and GLB export. Do not split
  the body into one assembly part and one fastened mate per colour; use
  assembly parts only for pieces that move or are separate BOM lines.
---

```typescript
// Same-material pieces are fused first and finished ONCE (two same-finish
// members that overlap fail union.member-overlap). Differently finished
// members keep their finish through union().
const dark = { color: '#1d1f23' };
const caseShell = union(
  box(22.8, 12.2, 22.5, true).translate(0, 0, 11.25),
  box(32.4, 12.2, 2.5, true).translate(0, 0, 16.75),
  cylinder(4, 5.9).translate(5.4, 0, 22.5),
).finish('abs', dark);

const horn = union(
  cylinder(4, 3.5).translate(5.4, 0, 26.5),
  box(18, 5, 1.6, true).translate(-3.6, 0, 29.7),
).finish('aluminium');

const screwA = cylinder(1.2, 1.9).translate(13.8, 0, 18).finish('steel');
const screwB = cylinder(1.2, 1.9).translate(-13.8, 0, 18).finish('steel');

// A cut face takes the body's finish, never the cutter's. A finish on the
// union result would recolour every face, so leave the result unfinished.
const notch = box(3, 4, 2, true).translate(-11.4, 0, 3);
return union(caseShell, horn, screwA, screwB).subtract(notch);
```

Full example: `examples/exports/servo-member-finishes.kcad.ts`.
