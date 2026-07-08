// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/microsd-spi.kcad.ts
//
// microSD SPI adapter breakout module.
// Overall footprint: 24 x 30 x 4 mm.
// Layout: blue PCB (24×30×1.6mm); microSD push-push slot (~14.5×13×2mm) on
// the +Y end with card ejection toward +Y; 6-pin 2.54mm SPI header on the
// -Y end; 3.3V LDO regulator and a few passives.

const PCB_L = 24.0;  // X
const PCB_W = 30.0;  // Y
const PCB_T = 1.6;

const PCB_BLUE  = '#1e3a5a';
const SD_SILVER = '#c0c0c8';
const SD_DARK   = '#383840';
const GOLD      = '#c8a040';
const PASSIVE   = '#7a6040';
const IC_DARK   = '#222228';

// PCB slab
const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB_BLUE);

// microSD slot housing (~14.5 wide × 13 deep × 2 tall, top-mount on +Y side)
const slotHousingL = 14.5;
const slotHousingW = 13.0;
const slotHousingH = 2.0;
const slotX = (PCB_L - slotHousingL) / 2;
const slotY = PCB_W - slotHousingW;
const sdSlot = box(slotHousingL, slotHousingW, slotHousingH)
  .color(SD_SILVER)
  .translate(slotX, slotY, PCB_T);
// Card opening at the +Y end (1.4mm tall, card slides in)
const cardOpening = box(slotHousingL - 2.0, 0.6, 1.4)
  .color(SD_DARK)
  .translate(slotX + 1.0, PCB_W - 0.3, PCB_T + 0.3);

// 6-pin SPI header on -Y end (Vcc, GND, MISO, MOSI, SCK, CS)
const pinCount = 6;
const pinPitch = 2.54;
const headerW = (pinCount - 1) * pinPitch + 2.5;
const headerX = (PCB_L - headerW) / 2;
const headerBody = box(headerW, 2.5, 2.5).color('#1a1a28').translate(headerX, -2.5, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < pinCount; i++) {
  const px = headerX + 1.25 + i * pinPitch;
  pins.push(box(0.6, 6.0, 0.6).color(GOLD).translate(px, -6.0, PCB_T + 0.9));
}

// 3.3V LDO (SOT-23-5 footprint)
const ldo = box(2.9, 2.8, 1.5).color(IC_DARK).translate(2.0, 5.0, PCB_T);

// Decoupling capacitors
const caps: Shape[] = [];
for (const [cx, cy] of [[5.0, 5.0], [5.0, 7.5], [18.0, 5.0], [18.0, 7.5]] as [number, number][]) {
  caps.push(box(1.0, 0.5, 0.5).color(PASSIVE).translate(cx, cy, PCB_T));
}

const asm = assembly('microsd-spi');
asm.part('pcb', pcb);
asm.part('sd-slot', sdSlot);
asm.part('card-opening', cardOpening);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('ldo', ldo);
caps.forEach((c, i) => asm.part(`cap-${i}`, c));

return asm.model();
