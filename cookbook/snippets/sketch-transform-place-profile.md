---
id: sketch-transform-place-profile
title: Place, turn and resize one 2D profile with sketch transforms
tags: [sketch, extrude, boolean, subtract]
keywords:
  - sketch translate
  - sketch rotate
  - sketch scale
  - move a profile
  - 2D transform
  - reuse a profile
  - place a cutout
  - rotate a slot
when_to_use: You have one closed 2D profile and need it somewhere else, at another angle or at another size before it becomes a solid — the same slot at several positions and angles in a plate, an imported DXF outline moved onto the part, a scaled section for a loft. Sketch.translate, Sketch.rotate and Sketch.scale return a new sketch and leave the source unchanged. They are synchronous. Arcs stay exact arcs.
---

```typescript
// One 16 x 6 mm slot, drawn once about the origin.
const slot = path()
  .moveTo(-5, -3).lineTo(5, -3).threePointsArc(5, 3, 8, 0)
  .lineTo(-5, 3).threePointsArc(-5, -3, -8, 0).close();

// Flange 80 x 50 mm. The slot is turned first (about the origin), then moved,
// so each copy is stated as an angle and a position.
const outline = path().moveTo(-40, -25).lineTo(40, -25).lineTo(40, 25).lineTo(-40, 25).close();
const profile = await outline.subtract([
  slot.translate(-24, 0),
  slot.rotate(90),
  slot.rotate(45).translate(24, 0),
]);

return profile.extrude(4);
```
