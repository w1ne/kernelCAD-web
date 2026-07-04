// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/ssd1306-oled-096.kcad.ts
//
// SSD1306 0.96" I2C OLED display module.
// Overall footprint: 27 x 27 x 4 mm.
// Layout: PCB slab (27x27x1.6mm, black); OLED glass panel (~23.5x23.5mm) sits
// on top inset from the PCB edge; active pixel area ~21x11mm (128x64 aspect).
// 4-pin I2C header (2.54mm pitch) on the bottom edge (+Y side).

const PCB_L = 27;
const PCB_W = 27;
const PCB_T = 1.6;

const PCB_BLACK = '#101014';
const GLASS_BLUE = '#0d1a2a';
const PIXEL_GLOW = '#1a3060';
const HEADER_GOLD = '#c8a040';
const PASSIVE_TAN = '#8a7050';

// PCB slab
const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB_BLACK);

// OLED glass panel (sits on top of PCB, centered)
const glassL = 23.5;
const glassW = 23.5;
const glassT = 1.6;
const glassX = (PCB_L - glassL) / 2;
const glassY = (PCB_W - glassW) / 2;
const glass = box(glassL, glassW, glassT).color(GLASS_BLUE).translate(glassX, glassY, PCB_T);

// Active pixel area (slightly recessed into glass)
const activeL = 21.7;
const activeW = 11.0;
const activeT = 0.4;
const activeX = glassX + (glassL - activeL) / 2;
const activeY = glassY + (glassW - activeW) / 2 + 1.5;
const activeArea = box(activeL, activeW, activeT).color(PIXEL_GLOW).translate(activeX, activeY, PCB_T + glassT - 0.2);

// 4-pin I2C header on the top edge (y=0 side), 2.54mm pitch, centered in X
const pinCount = 4;
const pinPitch = 2.54;
const headerW = (pinCount - 1) * pinPitch + 2.5;
const headerX = (PCB_L - headerW) / 2;
const headerY = -2.5;
const headerBody = box(headerW, 2.5, 2.5).color('#222230').translate(headerX, headerY, PCB_T);
// individual gold pins
const headerPins: Shape[] = [];
for (let i = 0; i < pinCount; i++) {
  const px = headerX + 1.25 + i * pinPitch;
  headerPins.push(
    box(0.6, 6.0, 0.6)
      .color(HEADER_GOLD)
      .translate(px, headerY - 3.5, PCB_T + 0.9),
  );
}

// A few decoupling capacitors (0402) on the back side
const caps: Shape[] = [];
const capPositions: [number, number][] = [
  [4, 4], [4, 7], [22, 4],
];
for (const [cx, cy] of capPositions) {
  caps.push(box(1.0, 0.5, 0.5).color(PASSIVE_TAN).translate(cx, cy, PCB_T));
}

// SSD1306 driver IC (small QFN on back of PCB, shown on underside)
const ic = box(4.0, 4.0, 0.8).color('#181820').translate(11, 11, -0.8);

const asm = assembly('ssd1306-oled-096');
asm.part('pcb', pcb);
asm.part('glass', glass);
asm.part('active-area', activeArea);
asm.part('header-body', headerBody);
headerPins.forEach((p, i) => asm.part(`header-pin-${i}`, p));
caps.forEach((c, i) => asm.part(`cap-${i}`, c));
asm.part('ssd1306-ic', ic);

return asm.model();
