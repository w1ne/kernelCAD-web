---
id: involute-spur-gear-pair
title: Involute spur gear mesh at module pitch
tags: [gear, involute, extrude, sketch, parameter, assembly]
keywords:
  - involute tooth flanks sampled from the involute curve
  - spur gear pair at 20 degree pressure angle
  - module and tooth counts set the pitch-circle center distance
  - meshing pinion and gear, not trapezoid teeth
when_to_use: >-
  You need a meshing involute spur gear pair (module, tooth counts, 20°
  pressure angle, face width) with true involute flanks sampled from the
  involute curve, not trapezoid teeth. Center distance is m(z1+z2)/2.
---

```typescript
const moduleMm = 2;
const z1 = 16;
const z2 = 24;
const pressureDeg = 20;
const faceWidth = 8;
const addendum = moduleMm;
const dedendum = moduleMm * 1.25;
const pitchR1 = (z1 * moduleMm) / 2;
const pitchR2 = (z2 * moduleMm) / 2;
const centerDistance = moduleMm * (z1 + z2) / 2; // m(z1+z2)/2
const samplesPerFlank = 5;

function involuteFn(t) {
  return t - Math.atan(t);
}

function gearProfile(toothCount, pitchR) {
  const phi = (pressureDeg * Math.PI) / 180;
  const baseR = pitchR * Math.cos(phi);
  const tipR = pitchR + addendum;
  const rootR = Math.max(pitchR - dedendum, baseR * 0.96);
  const tMax = Math.sqrt((tipR / baseR) ** 2 - 1);
  const tPitch = Math.sqrt((pitchR / baseR) ** 2 - 1);
  const tRoot = rootR > baseR ? Math.sqrt((rootR / baseR) ** 2 - 1) : 0;
  const halfTooth = Math.PI / (2 * toothCount);
  const pitchInv = involuteFn(tPitch);
  const points = [];
  for (let i = 0; i < toothCount; i += 1) {
    const toothAngle = ((2 * Math.PI) / toothCount) * i;
    const offsetPlus = toothAngle + halfTooth - pitchInv;
    const offsetMinus = toothAngle - halfTooth + pitchInv;
    for (let s = 0; s <= samplesPerFlank; s += 1) {
      const t = tRoot + ((tMax - tRoot) * s) / samplesPerFlank;
      const r = baseR * Math.sqrt(1 + t * t);
      const a = involuteFn(t) + offsetPlus;
      points.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    const tipAngPlus = involuteFn(tMax) + offsetPlus;
    const tipAngMinus = -involuteFn(tMax) + offsetMinus;
    const aMid = (tipAngPlus + tipAngMinus) / 2;
    points.push([tipR * Math.cos(aMid), tipR * Math.sin(aMid)]);
    for (let s = 0; s <= samplesPerFlank; s += 1) {
      const t = tMax - ((tMax - tRoot) * s) / samplesPerFlank;
      const r = baseR * Math.sqrt(1 + t * t);
      const a = -involuteFn(t) + offsetMinus;
      points.push([r * Math.cos(a), r * Math.sin(a)]);
    }
  }
  let sk = path().moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) sk = sk.lineTo(points[i][0], points[i][1]);
  return sk.close();
}

const pinion = gearProfile(z1, pitchR1).extrude(faceWidth);
// Even+even mesh: rotate the second gear by half a pitch.
const gear = gearProfile(z2, pitchR2)
  .extrude(faceWidth)
  .rotateZ(180 / z2)
  .translate(centerDistance, 0, 0);

const arm = assembly('involute-spur-gear-pair');
arm.part('pinion', pinion);
arm.part('gear', gear);
return arm.model();
```
