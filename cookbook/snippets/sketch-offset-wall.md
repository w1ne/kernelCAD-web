---
id: sketch-offset-wall
title: Make a uniform wall from one outline with Sketch.offset
tags: [sketch, extrude, boolean, subtract]
keywords:
  - offset a sketch
  - parallel curve
  - uniform wall thickness
  - inset profile
  - clearance pocket
  - tray from outline
when_to_use: You have one closed outline and need a second profile a fixed distance inside or outside it — a wall of constant thickness, a clearance pocket around a part, a lid plug, a gasket land. Sketch.offset(distance) returns that profile with exact lines and arcs. It is async, so await it. A negative distance shrinks the profile, a positive distance grows it.
---

```typescript
// Tray outline: 60 x 40 mm with R6 corners. The path runs counter-clockwise,
// so each convex corner bulges to the right of travel: a negative radius.
const outline = path()
  .moveTo(-24, -20).lineTo(24, -20).radiusArc(30, -14, -6)
  .lineTo(30, 14).radiusArc(24, 20, -6)
  .lineTo(-24, 20).radiusArc(-30, 14, -6)
  .lineTo(-30, -14).radiusArc(-24, -20, -6)
  .close();

// The same outline 2 mm inside: straight sides move in 2 mm and the R6 corners
// become R4, so the wall is 2 mm thick everywhere.
const cavity = await outline.offset(-2);

// 20 mm tall tray with a 2 mm floor.
return outline.extrude(20).subtract(cavity.extrude(18).translate(0, 0, 2));
```
