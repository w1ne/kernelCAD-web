// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/dht22.kcad.ts
//
// DHT22 / AM2302 temperature + humidity sensor.
// Overall footprint: 15 x 25 x 8 mm.
// Iconic feature: white rectangular body with a ventilation grille on the
// back face; four straight 1mm square pins protrude from the bottom (-Z).
// Grille is represented by overlaid dark strips (no boolean subtraction).

const BDY_L = 15.0;  // X
const BDY_W = 8.0;   // Y (depth)
const BDY_H = 25.0;  // Z (height)

const WHITE = '#e8e8ec';
const GRAY  = '#555560';  // grille strips
const DARK  = '#2a2a30';  // label area
const PIN   = '#c8c8c0';  // metallic pin

// Main body
const body = box(BDY_L, BDY_W, BDY_H).color(WHITE);

// Ventilation grille — dark strips on the back (+Y) face
const grille: Shape[] = [];
for (let i = 0; i < 8; i++) {
  const z = 3.0 + i * 2.2;
  if (z + 1.2 > BDY_H - 1.5) break;
  grille.push(box(BDY_L, 0.5, 1.2).color(GRAY).translate(0, BDY_W - 0.5, z));
}

// Small raised bump/nub at the top (sensor dome indicator)
const dome = cylinder(1.5, 2.5, 32).color('#d0d0d4').translate(BDY_L / 2, BDY_W / 2, BDY_H);

// Connector part-number label (dark rectangle on front face, near bottom)
const label = box(10.0, 0.3, 4.0).color(DARK).translate(2.5, 0.0, 3.0);

// Four 0.5mm square pins, 2.54mm pitch (centered in X)
const pins: Shape[] = [];
const pinH = 4.5;
const pinStartX = (BDY_L - 3 * 2.54) / 2;
for (let i = 0; i < 4; i++) {
  pins.push(
    box(0.5, 0.5, pinH)
      .color(PIN)
      .translate(pinStartX + i * 2.54, (BDY_W - 0.5) / 2, -pinH),
  );
}

const asm = assembly('dht22');
asm.part('body', body);
grille.forEach((g, i) => asm.part(`grille-${i}`, g));
asm.part('dome', dome);
asm.part('label', label);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));

return asm.model();
