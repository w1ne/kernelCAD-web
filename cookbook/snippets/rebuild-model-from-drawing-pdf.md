---
id: rebuild-model-from-drawing-pdf
title: Rebuild an editable model from an engineering drawing PDF
tags: [drawing, dimension, assumption-ledger]
keywords:
  - drawing_to_cad
  - engineering drawing pdf to cad
  - vector pdf print to parametric script
  - orthographic views to model
  - title block scale and projection angle
  - dimension disagrees with linework
  - rebuild from a 2d print
when_to_use: >-
  You were handed a vector PDF of an engineering drawing (orthographic views,
  lettered dimensions, a title block) and need an editable model, not a trace
  of a picture. Call drawing_to_cad({ path, out }): it reads the linework and
  dimension text, identifies the views by projection alignment, lets stated
  dimensions win over drawn lengths, extrudes the silhouette of the one
  non-rectangular view (or revolves a turned shaft), cuts ⌀ callouts along the
  axis of the view they are drawn in, and writes a script like the one below
  plus a ledger. Branch on fidelity.verdict, then settle the open ledger facts
  (mirrored positions, measured values, disagreements) with resolve_assumptions
  before relying on the model. A scanned page fails with
  reference.drawing.raster-only; use trace_from_image for that.
---

```typescript
// Emitted by drawing_to_cad for examples/drawing-to-cad/motor-mount-bracket.pdf.
// Every param is a stated dimension; the second base hole and the wall hole's
// Y are expressions, because the drawing places them by symmetry (open
// `symmetry:` facts in the ledger).
const width = param('width', 70, { description: 'X span — dimension 70 (front view)' });
const leftThickness = param('leftThickness', 5, { description: 'X span — dimension 5 (front view)' });
const hole1X = param('hole1X', 45, { description: 'X span — dimension 45 (top view)' });
const depth = param('depth', 50, { description: 'Y span — dimension 50 (top view)' });
const hole1Y = param('hole1Y', 12, { description: 'Y span — dimension 12 (top view)' });
const height = param('height', 45, { description: 'Z span — dimension 45 (front view)' });
const bottomThickness = param('bottomThickness', 5, { description: 'Z span — dimension 5 (front view)' });
const hole3Z = param('hole3Z', 27, { description: 'Z span — dimension 27 (left view)' });
const holeDia1 = param('holeDia1', 5.5, { description: 'hole diameter — callout 2× ⌀5.5 THRU' });
const holeDia2 = param('holeDia2', 12, { description: 'hole diameter — callout ⌀12 THRU' });

let part = path()
  .moveTo(0, 0)
  .lineTo(width, 0)
  .lineTo(width, bottomThickness)
  .lineTo(leftThickness, bottomThickness)
  .lineTo(leftThickness, height)
  .lineTo(0, height)
  .lineTo(0, 0)
  .close()
  .extrude(depth)
  .rotateX(90)
  .translate(0, depth, 0);

part = part.subtract(cylinder(bottomThickness.add(2), holeDia1.divide(2)).translate(hole1X, hole1Y, -1));
part = part.subtract(cylinder(bottomThickness.add(2), holeDia1.divide(2)).translate(hole1X, depth.subtract(hole1Y), -1));
part = part.subtract(cylinder(leftThickness.add(2), holeDia2.divide(2)).rotateY(90).translate(-1, depth.divide(2), hole3Z));

return part;
```
