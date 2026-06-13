// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/visual/emboss-and-project-smoke.kcad.ts
//
// W3 visual smoke fixture. Exercises both face-authoring features in one
// scene: an embossed brand mark on a box plate and a projected closed
// silhouette wrapped onto a cylinder face.

const plate = box(60, 30, 4);
const embossed = plate.embossText({
  textContent: 'KCAD',
  face: 'top',
  size: 4,
  depth: 0.5,
  align: 'center',
  anchorU: 0.5,
  anchorV: 0.5,
});

// Closed brand silhouette expressed as raw SketchCommand[] so we can pipe it
// into projectCurve without depending on a separate Sketch handle. Coordinates
// are in mm; the lowerer normalises against the face UV bounds (scaleMode
// default 'original').
const mm = (n) => ({ expression: String(n), unit: 'mm', evaluated: n });
const logoCommands = [
  { kind: 'moveTo', x: mm(-4), y: mm(-3) },
  { kind: 'lineTo', x: mm(4),  y: mm(-3) },
  { kind: 'lineTo', x: mm(4),  y: mm(3)  },
  { kind: 'lineTo', x: mm(-4), y: mm(3)  },
  { kind: 'close' },
];
const bottle = cylinder(60, 15);
// projectCurve returns a sketch-tagged Shape; chain `.extrude(d)` to land a
// raised silhouette on the cylinder's top face.
const branded = bottle.projectCurve({
  source: { kind: 'sketchCommands', commands: logoCommands },
  face: 'top',
});
const logoSolid = branded.extrude(0.4);

return embossed.union(bottle.union(logoSolid).translate(80, 0, 0));
