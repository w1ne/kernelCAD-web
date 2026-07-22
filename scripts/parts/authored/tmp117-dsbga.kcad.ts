// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/tmp117-dsbga.kcad.ts
//
// Texas Instruments TMP117 in the six-ball YBG DSBGA package.
// Nominal external package: 1.488 × 0.95 × 0.531 mm; 0.4 mm ball pitch.
// Dimensions: https://www.ti.com/lit/ds/symlink/tmp117.pdf

const PACKAGE_LENGTH = 1.488;
const PACKAGE_WIDTH = 0.95;
const PACKAGE_HEIGHT = 0.531;
// The YBG drawing specifies 0.23–0.27 mm balls; model the 0.25 mm nominal
// diameter as real spheres, including the nominal 0.25 mm stand-off.
const BALL_STANDOFF = 0.25;
const DIE_HEIGHT = PACKAGE_HEIGHT - BALL_STANDOFF;
const BALL_RADIUS = 0.125;
const BALL_PITCH = 0.4;
const FIRST_BALL_X = 0.344;
const ROW_Y = [0.275, 0.675];

const DIE_BLACK = '#20232b';
const BALL_METAL = '#c8ccd0';
const MARKER_YELLOW = '#f2d35a';

const die = box(PACKAGE_LENGTH, PACKAGE_WIDTH, DIE_HEIGHT)
  .translate(0, 0, BALL_STANDOFF)
  .color(DIE_BLACK);
const pinOneMarker = cylinder(0.04, 0.09, 16)
  .translate(0.23, 0.23, PACKAGE_HEIGHT - 0.04)
  .color(MARKER_YELLOW);

const asm = assembly('tmp117-dsbga');
asm.part('package-die', die);
asm.part('pin-1-marker', pinOneMarker);

for (let row = 0; row < ROW_Y.length; row++) {
  for (let column = 0; column < 3; column++) {
    const ballNumber = row * 3 + column + 1;
    asm.part(
      `ball-${ballNumber}`,
      sphere(BALL_RADIUS)
        .translate(FIRST_BALL_X + column * BALL_PITCH, ROW_Y[row], BALL_RADIUS)
        .color(BALL_METAL),
    );
  }
}

return asm.model();
