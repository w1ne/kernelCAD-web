---
id: fdm-fit-clearance-by-fit-type
title: FDM print fit clearance by fit type (press/snap/slip/running) checked by dfmSpec
tags: [tolerance, printer, manufacturing, choice-param, hole, assembly, print-orientation]
keywords:
  - print clearance for a snap fit lid press fit slip fit running fit
  - FDM tolerance per side 0.1 0.2 0.3 mm for 3D printed parts
  - Bambu A1 P1S Prusa printer clearance gap between printed parts
  - pin in a bore, lid lip in an opening, sliding fit gap
  - dfmSpec process fdm printer minWall minClearance check
when_to_use: >-
  Two printed parts must fit together (lid lip in a box, pin in a hole, slider in
  a slot, snap-fit catch). Pick the per-side clearance from the fit type as a
  param, size the female feature with it (hole diameter + 2c, lip width - 2c), and
  declare `dfmSpec({ process: 'fdm', printer, minWall, minClearance })` so every
  evaluate measures the real gap and the bed fit. Do not hard-code an unexplained 0.2.
---

```typescript
// Per-side clearance for a 0.4 mm nozzle, well-tuned FDM printer (PLA/PETG).
// Print a test coupon and tune; coarse printers want +0.05-0.1.
//   fit       per side   use
//   press     0.05       bearing/magnet/pin pressed in, no movement
//   snap      0.15       snap-fit lid lip, clip catch
//   slip      0.20       removable lid, slide-on cover
//   running   0.30       rotating pin, hinge axle, slider
const FIT: Record<string, number> = { press: 0.05, snap: 0.15, slip: 0.2, running: 0.3 };
const fit = param('Fit', 'running', { choices: ['press', 'snap', 'slip', 'running'] });
const c = FIT[fit.value];
const pinD = 8;

// Female part: the bore is the pin diameter + 2 x clearance (a lid lip would be
// the opening - 2 x clearance instead).
const bracket = box(30, 20, 12).translate(-15, -10, 0)
  .hole('top', { u: 0, v: 0, diameter: pinD + 2 * c, depth: 'through', name: 'bore' });
// Male part: nominal size, longer than the bore so it only meets the bore wall.
const pin = cylinder(20, pinD / 2).translate(0, 0, -4);

// The gate measures the real gap between the parts (exact BREP distance) and
// runs the FDM printability check against the named printer's bed.
dfmSpec({
  process: 'fdm',
  printer: 'bambu-a1',
  minWall: 1.2,
  minClearance: c * 0.9,
});

const asm = assembly('fdm-fit');
asm.part('bracket', bracket, { material: 'pla' });
asm.part('pin', pin, { material: 'pla' });
return asm.model();
```
