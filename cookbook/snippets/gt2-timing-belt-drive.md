---
id: gt2-timing-belt-drive
title: GT2 timing-belt drive with pitch-diameter pulleys
tags: [belt, pulley, drive, extrude, sketch, assembly, parameter]
keywords:
  - GT2 timing belt 2 mm pitch
  - toothed pulleys at a center distance
  - belt length from pitch diameters and center distance
  - rounded to a real GT2 tooth count
when_to_use: >-
  You need a GT2 timing-belt drive: two toothed pulleys at a center
  distance, with belt length computed from pitch diameters and center
  distance then rounded to a real GT2 tooth count (2 mm pitch).
---

```typescript
const pitch = 2; // GT2
const z1 = 20;
const z2 = 20;
const C = 60; // center distance
const faceWidth = 8;
const boreR = 2.5;
const pd1 = (z1 * pitch) / Math.PI;
const pd2 = (z2 * pitch) / Math.PI;
const rawLength = 2 * C + (Math.PI * (pd1 + pd2)) / 2 + ((pd2 - pd1) ** 2) / (4 * C);
const beltTeeth = Math.round(rawLength / pitch);
const beltLength = beltTeeth * pitch;

function gt2Pulley(teeth, pd) {
  const pitchR = pd / 2;
  const rootR = pitchR - 0.6;
  const nubR = 0.85; // rounded tooth; 2 mm pitch keeps nubs from overlapping
  let body = cylinder(faceWidth, rootR);
  for (let i = 0; i < teeth; i += 1) {
    const a = (2 * Math.PI * i) / teeth;
    body = body.union(
      cylinder(faceWidth, nubR).translate(pitchR * Math.cos(a), pitchR * Math.sin(a), 0),
    );
  }
  return body.subtract(cylinder(faceWidth + 2, boreR).translate(0, 0, -1));
}

const pulleyA = gt2Pulley(z1, pd1);
const pulleyB = gt2Pulley(z2, pd2).translate(C, 0, 0);

// Closed pitch-line loop: two 180° wraps + two tangents. Cord r=0.7 so
// inspect volume / (π r²) recovers beltLength.
const cordR = 0.7;
const wrapA = torus(pd1 / 2, cordR)
  .subtract(box(pd1 * 2, pd1 * 2, 4).translate(-0.2, -pd1, -2));
const wrapB = torus(pd2 / 2, cordR)
  .translate(C, 0, 0)
  .subtract(box(pd2 * 2, pd2 * 2, 4).translate(C - pd2 * 2 + 0.2, -pd2, -2));
const tanTop = cylinder(C, cordR).alongAxis([1, 0, 0]).translate(0, pd1 / 2, 0);
const tanBot = cylinder(C, cordR).alongAxis([1, 0, 0]).translate(0, -pd1 / 2, 0);
const belt = wrapA.union(wrapB, tanTop, tanBot);

const arm = assembly(`gt2-${beltTeeth}t-${beltLength}mm`);
arm.part('pulley-a', pulleyA);
arm.part('pulley-b', pulleyB);
arm.part('gt2-belt', belt);
return arm.model();
```
