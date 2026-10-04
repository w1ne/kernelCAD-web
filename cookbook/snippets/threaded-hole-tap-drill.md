---
id: threaded-hole-tap-drill
title: Threaded (tapped) M3/M4/M5/M6 hole with the ISO tap drill via hole({ thread })
tags: [hole, thread, fastener, bolt, bracket, plate, choice-param, manufacturing]
keywords:
  - M3 M4 M5 M6 threaded hole tapped hole internal thread
  - tap drill size from the ISO metric coarse pitch table
  - hole thread pitch modeled clearance instead of subtracting a cylinder
  - threaded mounting holes in a 3D printed bracket or machined plate
  - clearance hole table close normal fit ISO 273 for the mating screw
  - self-tapping screw pilot into printed plastic
when_to_use: >-
  The request names a metric screw size (M3, M4, M5, M6...) or says threaded,
  tapped, tap drill or internal thread. Use `shape.hole(face, { diameter: <nominal>,
  thread: { pitch } })` / `holes(...)`: the kernel drills the ISO 68-1 minor
  diameter (d - 1.0825*P, the tap drill) and records the thread for drawings and
  BOM. Do NOT subtract a plain cylinder of a guessed tap size. `modeled: true`
  cuts the real helical groove (slow; for printed threads).
---

```typescript
// ISO 261/262 coarse pitch, ISO tap drill (= d - P), ISO 273 clearance holes.
//   size  pitch  tap drill  clearance close (fine)  normal (medium)
//   M3    0.5    2.5        3.2                     3.4
//   M4    0.7    3.3        4.3                     4.5
//   M5    0.8    4.2        5.3                     5.5
//   M6    1.0    5.0        6.4                     6.6
// hole({ thread }) takes the NOMINAL diameter and drills the minor diameter
// d - 1.0825*P itself (M4: 3.24 mm). For a clearance hole in the mating part,
// use hole({ diameter: CLEAR[size].normal }) with no thread.
// FDM: printed holes shrink 0.1-0.2 mm; for a screw tapped straight into
// plastic keep modeled: false (the bore is the pilot) and tap it after printing.
const ISO: Record<string, { d: number; pitch: number; close: number; normal: number }> = {
  M3: { d: 3, pitch: 0.5, close: 3.2, normal: 3.4 },
  M4: { d: 4, pitch: 0.7, close: 4.3, normal: 4.5 },
  M5: { d: 5, pitch: 0.8, close: 5.3, normal: 5.5 },
  M6: { d: 6, pitch: 1.0, close: 6.4, normal: 6.6 },
};
const size = param('Size', 'M4', { choices: ['M3', 'M4', 'M5', 'M6'] });
const spec = ISO[size.value];
const t = param('thickness', 8, { min: 4, max: 20 });
const spacing = 30;

// Bracket plate, centred on the origin. hole u/v are offsets from the centre of
// the entry face (top: u = +X, v = +Y).
const plate = box(50, 20, t).translate(-25, -10, 0);
const tapped = plate.holes('top', {
  positions: [{ u: -spacing / 2, v: 0 }, { u: spacing / 2, v: 0 }],
  diameter: spec.d,             // nominal size, not the tap drill
  depth: 'through',
  thread: { pitch: spec.pitch, modeled: false },
  name: 'tapped',
});

return tapped;
```
