// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/gp2y0a21.kcad.ts
//
// Sharp GP2Y0A21YK0F analogue IR distance sensor, 10–80 cm.
// Body 29.5 × 13 × 13.5 mm; two Ø7 lenses (emitter + detector, ~20 mm apart)
// on the front face; 3-pin JST-PH pigtail connector on the back.
//
// The lenses face +Y (the measuring direction), which is what makes the part
// recognisable in one second — an upright ranger, not another flat breakout.

const BODY_L = 29.5; // X
const BODY_D = 13.0; // Y
const BODY_H = 13.5; // Z

const BODY = '#16161a'; // black housing
const LENS = '#232c3a'; // dark lens glass
const LENS_RIM = '#0c0c10';
const CONN = '#e8e8e4'; // JST-PH white
const PIN = '#c8c8c0';

// Housing, standing upright: lenses on the +Y face, connector at the back.
const body = box(BODY_L, BODY_D, BODY_H).color(BODY);

// Two lenses on the front face, emitter/detector pair 20 mm apart, centred at
// half height. Cylinders are Z-axis natively; rotate about X to face +Y.
const lensZ = BODY_H / 2;
const lensY = BODY_D - 1.0; // proud of the face by ~1 mm
const mkLens = (x: number): Shape[] => {
  const rim = cylinder(2.0, 3.6, 24).color(LENS_RIM).rotate([1, 0, 0], -90).translate(x, lensY - 1.2, lensZ);
  const glass = cylinder(1.2, 3.1, 24).color(LENS).rotate([1, 0, 0], -90).translate(x, lensY - 0.4, lensZ);
  return [rim, glass];
};
const lenses = [...mkLens(-10), ...mkLens(10)];

// 3-pin JST-PH connector on the back (-Y) face: white shroud + three pins.
const conn = box(6.0, 2.2, 4.5).color(CONN).translate(-3.0, -1.2, lensZ - 2.25);
const pins: Shape[] = [];
for (let i = 0; i < 3; i++) {
  pins.push(
    box(0.5, 2.4, 0.5)
      .color(PIN)
      .translate(-2.54 + i * 2.54, -1.2, lensZ - 0.25),
  );
}

const asm = assembly('gp2y0a21');
asm.part('body', body);
lenses.forEach((l, i) => asm.part(`lens-${i}`, l));
asm.part('connector', conn);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
return asm.model();
