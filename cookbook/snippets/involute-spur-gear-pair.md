---
id: involute-spur-gear-pair
title: Involute spur gear mesh at module pitch
tags: [gear, involute, extrude, parameter, assembly]
keywords:
  - involute spur gear primitive spurGear module teeth pressure angle
  - spur gear pair at 20 degree pressure angle
  - module and tooth counts set the pitch-circle center distance
  - meshing pinion and gear with backlash, not trapezoid teeth
when_to_use: >-
  You need a meshing involute spur gear pair (module, tooth counts, 20°
  pressure angle, face width, bore, backlash). Use the `spurGear(...)`
  primitive: it generates true involute flanks, a trochoid root fillet and
  correct undercut as ONE manifold solid. Center distance is m(z1+z2)/2.
---

```typescript
const moduleMm = 1;
const z1 = 20;
const z2 = 40;
const faceWidth = 6;
// Circular play at the pitch circle. Raise to 0.1-0.2 mm for FDM prints.
const backlash = 0.05;
const centerDistance = moduleMm * (z1 + z2) / 2; // m(z1+z2)/2

// spurGear builds one closed involute profile (tooth 0 on +X), extruded
// from z = 0 to z = faceWidth, with a through-bore.
const pinion = spurGear({ module: moduleMm, teeth: z1, faceWidth, bore: 5, backlash });
// Turn the second gear so a tooth SPACE faces the pinion's tooth 0:
// half a pitch when z2 is even, none when it is odd.
const gear = spurGear({ module: moduleMm, teeth: z2, faceWidth, bore: 8, backlash })
  .rotateZ(z2 % 2 === 0 ? 180 / z2 : 0)
  .translate(centerDistance, 0, 0);

const pair = assembly('involute-spur-gear-pair');
pair.part('pinion', pinion);
pair.part('gear', gear);
return pair.model();
```
