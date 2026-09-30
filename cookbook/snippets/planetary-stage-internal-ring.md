---
id: planetary-stage-internal-ring
title: Planetary stage with sun, planets, and internalSpurGear ring
tags: [gear, involute, planetary, assembly, parameter]
keywords:
  - planetary gear stage sun planets ring carrier
  - internalSpurGear ringGear internalGear annulus
  - Zring equals Zsun plus 2 Zplanet pitch compatibility
  - planetaryToothCompatibility coaxial reduction gearbox
  - involute internal spur ring meshing planets
when_to_use: >-
  You need a coaxial planetary gear stage (sun + planet(s) + internal ring)
  with true involute teeth, not cylinders. Use `spurGear` for the sun and
  planets, `internalSpurGear` (aliases `ringGear` / `internalGear`) for the
  annulus, and `planetaryToothCompatibility({ sunTeeth, planetTeeth, ringTeeth })`
  so Zring = Zsun + 2·Zplanet. Carrier pins sit at centre distance
  m(Zsun+Zplanet)/2.
---

```typescript
const moduleMm = 1;
const zSun = 18;
const zPlanet = 18;
const zRing = zSun + 2 * zPlanet; // 54 — pitch circles meet
const faceWidth = 8;
const backlash = 0.05;
const planetCount = 3;

// Throws feature.invalid-args unless Zring === Zsun + 2·Zplanet.
planetaryToothCompatibility({ sunTeeth: zSun, planetTeeth: zPlanet, ringTeeth: zRing });

const sunPitchR = (moduleMm * zSun) / 2;
const planetPitchR = (moduleMm * zPlanet) / 2;
const carrierR = sunPitchR + planetPitchR; // m(Zsun+Zplanet)/2

const sun = spurGear({ module: moduleMm, teeth: zSun, faceWidth, bore: 6, backlash });
// Prefer internalSpurGear; ringGear / internalGear are aliases (same solid).
const ring = internalSpurGear({
  module: moduleMm,
  teeth: zRing,
  faceWidth,
  backlash,
  rimThickness: 4,
});

const stage = assembly('planetary-stage');
stage.part('ring', ring);
stage.part('sun', sun);

for (let i = 0; i < planetCount; i += 1) {
  const ang = (360 / planetCount) * i;
  const rad = (ang * Math.PI) / 180;
  // Half-pitch when even, then spin about own centre, then place on carrier circle.
  const planet = spurGear({ module: moduleMm, teeth: zPlanet, faceWidth, bore: 4, backlash })
    .rotateZ((zPlanet % 2 === 0 ? 180 / zPlanet : 0) + ang)
    .translate(carrierR * Math.cos(rad), carrierR * Math.sin(rad), 0);
  stage.part(`planet-${i + 1}`, planet);
}

return stage.model();
```
