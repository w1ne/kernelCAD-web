---
id: sketch-boolean-keyhole
title: Build a keyhole plate from simple profiles with sketch booleans
tags: [sketch, extrude, boolean, subtract]
keywords:
  - 2D boolean
  - sketch union
  - sketch subtract
  - sketch intersect
  - combine profiles
  - keyhole slot
  - profile with holes
when_to_use: You need one outline that is easier to state as simple shapes than as one hand-computed path — a keyhole, a plate with lugs, a D-shaft section, a profile with holes that several features share. Sketch.union, Sketch.subtract and Sketch.intersect combine closed profiles and return one sketch with exact lines and arcs. They are async, so await them. The result must be one outline with holes.
---

```typescript
// Keyhole: a 8 mm slot plus a 14 mm round head. The union finds where the
// circle meets the slot walls, so no intersection point is computed by hand.
const slot = path().moveTo(-4, 0).lineTo(4, 0).lineTo(4, 14).lineTo(-4, 14).close();
const keyhole = await slot.union(path().circle(0, 18, 7));

// Hanger plate 30 x 38 mm. The keyhole lies inside the outline, so the
// subtraction makes it a hole of the plate profile.
const outline = path().moveTo(-15, -6).lineTo(15, -6).lineTo(15, 32).lineTo(-15, 32).close();
const plate = await outline.subtract(keyhole);

return plate.extrude(3);
```
