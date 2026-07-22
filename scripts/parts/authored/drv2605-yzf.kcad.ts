// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/drv2605-yzf.kcad.ts
//
// Texas Instruments DRV2605 in the nine-ball YZF DSBGA package.
// Nominal package body: 1.44 × 1.44 mm (1.41–1.47 mm limits), 0.625 mm max
// height, with 0.5 mm ball pitch.
// Dimensions: https://www.ti.com/lit/gpn/DRV2605

const PACKAGE_SIDE = 1.44;
const PACKAGE_HEIGHT = 0.625;
// YZF specifies 0.25–0.35 mm balls; use the 0.30 mm nominal diameter and
// stand-off as actual spherical solder balls.
const BALL_STANDOFF = 0.3;
const DIE_HEIGHT = PACKAGE_HEIGHT - BALL_STANDOFF;
const BALL_RADIUS = 0.15;
const BALL_PITCH = 0.5;
const FIRST_BALL = 0.22;

const DIE_BLACK = '#20232b';
const BALL_METAL = '#c8ccd0';
const MARKER_YELLOW = '#f2d35a';

const die = box(PACKAGE_SIDE, PACKAGE_SIDE, DIE_HEIGHT)
  .translate(0, 0, BALL_STANDOFF)
  .color(DIE_BLACK);
const pinOneMarker = cylinder(0.04, 0.09, 16)
  .translate(0.22, 0.22, PACKAGE_HEIGHT - 0.04)
  .color(MARKER_YELLOW);

const asm = assembly('drv2605-yzf');
asm.part('package-die', die);
asm.part('pin-1-marker', pinOneMarker);

for (let row = 0; row < 3; row++) {
  for (let column = 0; column < 3; column++) {
    const ballNumber = row * 3 + column + 1;
    asm.part(
      `ball-${ballNumber}`,
      sphere(BALL_RADIUS)
        .translate(FIRST_BALL + column * BALL_PITCH, FIRST_BALL + row * BALL_PITCH, BALL_RADIUS)
        .color(BALL_METAL),
    );
  }
}

return asm.model();
