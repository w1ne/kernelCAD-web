// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/bme280.kcad.ts
//
// BME280 environmental sensor breakout (Adafruit / SparkFun style).
// Overall footprint: 19 x 18 x 3 mm.
// Layout: blue PCB slab; BME280 LGA package (2.5×2.5×0.9mm) near center;
// 6-pin 2.54mm header on one long edge; a few 0402 passives.

const PCB_L = 19.0;
const PCB_W = 18.0;
const PCB_T = 1.6;

const PCB_BLUE = '#1a2a4a';
const IC_DARK  = '#282830';
const GOLD     = '#c8a040';
const PASSIVE  = '#7a6040';

// PCB slab
const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB_BLUE);

// BME280 LGA chip (2.5×2.5×0.9mm, center of board slightly toward +X)
const bme = box(2.5, 2.5, 0.9).color(IC_DARK).translate(9.5, 8.0, PCB_T);

// 6-pin header (2.54mm pitch) on the left short edge (x=0 side)
const pinCount = 6;
const pinPitch = 2.54;
const headerH = (pinCount - 1) * pinPitch + 2.5;
const headerY = (PCB_W - headerH) / 2;
const headerBody = box(2.5, headerH, 2.5).color('#222236').translate(-2.5, headerY, PCB_T);
const headerPins: Shape[] = [];
for (let i = 0; i < pinCount; i++) {
  const py = headerY + 1.25 + i * pinPitch;
  headerPins.push(
    box(6.0, 0.6, 0.6).color(GOLD).translate(-6.0, py, PCB_T + 0.9),
  );
}

// 0402 decoupling capacitors
const caps: Shape[] = [];
const capPos: [number, number][] = [
  [14.0, 6.0], [14.0, 8.5], [14.0, 11.0], [16.0, 6.0],
];
for (const [cx, cy] of capPos) {
  caps.push(box(1.0, 0.5, 0.5).color(PASSIVE).translate(cx, cy, PCB_T));
}

const asm = assembly('bme280');
asm.part('pcb', pcb);
asm.part('bme280-ic', bme);
asm.part('header-body', headerBody);
headerPins.forEach((p, i) => asm.part(`header-pin-${i}`, p));
caps.forEach((c, i) => asm.part(`cap-${i}`, c));

return asm.model();
