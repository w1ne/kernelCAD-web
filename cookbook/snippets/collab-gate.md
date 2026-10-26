---
id: collab-gate
title: Gate a collaborative edit on the shared requirements ledger
tags: [collaboration, merge, gate, requirement, assembly]
keywords:
  - two agents editing one model
  - merge queue gate
  - requirement blocks a submission
  - concurrent feature edit
when_to_use: Two agents edit different parts of one assembly and a shared interface requirement must stay green. Merge on feature id, evaluate only the merged candidate, and reject the submitter whose edit breaks the requirement instead of silently landing it.
example: examples/collab/bracket-and-motor-plate.kcad.ts
---

```typescript
// The two parts are authored independently; the hole pattern is the interface.
const asm = assembly('bracket and motor plate');
const bracketPart = asm.part('bracket', bracket, { at: [0, 0, 0] });
const motorPart = asm.part('motor_plate', motorPlate, { at: [0, 0, 0] });

require('hole-pattern', concentric(
  faces(bracketHole, { ofSurfaceType: 'CYLINDER' }),
  faces(motorHole, { ofSurfaceType: 'CYLINDER' }),
).within(0.5));

return asm.model();
```
