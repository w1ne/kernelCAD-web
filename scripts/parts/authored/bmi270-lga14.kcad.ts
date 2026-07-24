// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/bmi270-lga14.kcad.ts
//
// Bosch Sensortec BMI270, 14-pin LGA package.
// Nominal external package: 3.0 × 2.5 × 0.83 mm.
// Dimensions: https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmi270-ds000.pdf
//
// The model is a reusable, solder-side LGA package: two seven-contact rows and
// a top-side pin-one mark, rather than a project-specific sensor breakout.

const PACKAGE_LENGTH = 3.0;
const PACKAGE_WIDTH = 2.5;
const PACKAGE_HEIGHT = 0.83;
const BODY_HEIGHT = 0.76;
const CONTACT_HEIGHT = 0.07;
const CONTACT_SIZE = 0.24;
const CONTACTS_PER_ROW = 7;
const PIN_PITCH = 0.4;
const FIRST_CONTACT_X = 0.3;
const ROW_Y = [0.3, 2.2];

const MOLD_BLACK = '#20232b';
const CONTACT_GOLD = '#c8a13c';
const MARKER_YELLOW = '#f2d35a';

const body = box(PACKAGE_LENGTH, PACKAGE_WIDTH, BODY_HEIGHT)
  .translate(0, 0, CONTACT_HEIGHT)
  .color(MOLD_BLACK);
const pinOneMarker = cylinder(0.06, 0.11, 16)
  .translate(0.35, 0.35, PACKAGE_HEIGHT - 0.06)
  .color(MARKER_YELLOW);

const asm = assembly('bmi270-lga14');
asm.part('package-body', body);
asm.part('pin-1-marker', pinOneMarker);

for (let row = 0; row < ROW_Y.length; row++) {
  for (let column = 0; column < CONTACTS_PER_ROW; column++) {
    const contactNumber = row * CONTACTS_PER_ROW + column + 1;
    const x = FIRST_CONTACT_X + column * PIN_PITCH;
    asm.part(
      `contact-${String(contactNumber).padStart(2, '0')}`,
      box(CONTACT_SIZE, CONTACT_SIZE, CONTACT_HEIGHT)
        .translate(x - CONTACT_SIZE / 2, ROW_Y[row] - CONTACT_SIZE / 2, 0)
        .color(CONTACT_GOLD),
    );
  }
}

return asm.model();
