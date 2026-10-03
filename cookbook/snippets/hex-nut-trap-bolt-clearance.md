---
id: hex-nut-trap-bolt-clearance
title: Hex nut trap pocket with bolt clearance hole (M3-M6, FDM clearance)
tags: [hole, cutout, hex, fastener, bolt, pocket, manufacturing, choice-param]
keywords:
  - nut trap for M3 M4 M5 M6 bolt captive hex nut pocket
  - hex pocket across flats plus FDM clearance
  - captured nut recess under a bolt clearance hole
  - ISO 4032 nut across-flats and height table
  - nut pocket in a 3D printed part, printer tolerance
when_to_use: >-
  A printed or machined part needs a captive hex nut under a bolt. Cut the
  through clearance hole with `hole()` and the hexagonal pocket with
  `cutout(hexPath, { face: 'bottom', depth })`, sized from the nut's across-flats
  (AF) + 2 x clearance and nut height + clearance. Do not subtract a cylinder or a
  hand-placed prism.
---

```typescript
// ISO 4032 hex nut (AF across flats, m height) and ISO 273 normal clearance hole.
//   size  AF    m     clearance hole
//   M3    5.5   2.4   3.4
//   M4    7.0   3.2   4.5
//   M5    8.0   4.7   5.5
//   M6    10.0  5.2   6.6
const NUT: Record<string, { af: number; m: number; clear: number }> = {
  M3: { af: 5.5, m: 2.4, clear: 3.4 },
  M4: { af: 7.0, m: 3.2, clear: 4.5 },
  M5: { af: 8.0, m: 4.7, clear: 5.5 },
  M6: { af: 10.0, m: 5.2, clear: 6.6 },
};
const size = param('Bolt', 'M3', { choices: ['M3', 'M4', 'M5', 'M6'] });
const nut = NUT[size.value];
// Per-side FDM clearance on the hex flats (0.1-0.2 mm for a press-in nut on a
// tuned printer; 0 for a machined pocket).
const fdmClearance = 0.15;
const t = 10;

// Hex with flats = AF + 2*clearance; vertex radius R = AF / sqrt(3).
const af = nut.af + 2 * fdmClearance;
const r = af / Math.sqrt(3);
let hex = path();
for (let i = 0; i < 6; i += 1) {
  const a = (Math.PI / 180) * (30 + 60 * i);
  hex = i === 0 ? hex.moveTo(r * Math.cos(a), r * Math.sin(a)) : hex.lineTo(r * Math.cos(a), r * Math.sin(a));
}

// Block centred in X/Y. Bolt enters from the top, nut is trapped from the bottom.
const block = box(24, 24, t).translate(-12, -12, 0)
  .hole('top', { u: 0, v: 0, diameter: nut.clear, depth: 'through', name: 'boltClear' })
  .cutout(hex.close(), { face: 'bottom', depth: nut.m + 0.3 });

return block;
```
