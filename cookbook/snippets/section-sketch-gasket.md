---
id: section-sketch-gasket
title: Extrude a gasket from a solid cross-section
tags: [sketch, extrude, hole, boolean, plate, subtract]
keywords:
  - gasket from cross section
  - section a solid back to a sketch
  - slice a boolean result into 2D
  - sectionSketch
when_to_use: You have a 3D part (an imported STEP or a boolean result) and need a 2D profile from its cross-section to extrude a gasket, spacer, or shim — or to re-dimension the section. sectionSketch returns a real Sketch whose arcs stay exact, with holes as inner loops, so one extrude reproduces the cross-section.
---

```typescript
// A 60x40x12 plate with two Ø10 through-holes drilled from the top.
const plate = box(60, 40, 12)
  .hole('top', { u: -20, v: 0, diameter: 10, depth: 'through' })
  .hole('top', { u: 20, v: 0, diameter: 10, depth: 'through' });

// Exact planar cross-section at z = 6, expressed in the XY plane's 2D frame.
// The result is a single Sketch: outer boundary first, then the two holes.
const section = await plate.sectionSketch({ plane: 'xy', offset: 6 });

// Extrude the section into a 3 mm gasket that matches the part's outline.
return section.extrude(3);
```
