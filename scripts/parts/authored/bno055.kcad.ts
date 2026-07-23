// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/bno055.kcad.ts
//
// BNO055 9-DOF absolute orientation IMU breakout (Adafruit #2472 class).
// 20.3 × 27 mm; LGA package with pin-1; 9-pin header; PS0/PS1 + ADDR pads.

const PCB_L = 20.3;
const PCB_W = 27.0;
const PCB_T = 1.6;
const HOLE_R = 1.0;

const PCB = '#1a3a6e';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const LED = '#a78bfa';

const holes = [
  [2.0, 2.0],
  [PCB_L - 2.0, 2.0],
  [2.0, PCB_W - 2.0],
  [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

const n = 9;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = (PCB_L - hdrW) / 2;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.5, 0.64).color(CU).translate(px, -7.5, PCB_T + 0.95));
}

// BNO055 LGA ~3.8×5.2×1.1
const lga = box(3.8, 5.2, 1.15).color(IC).translate(8.25, 11.5, PCB_T);
const pin1 = cylinder(0.18, 0.25, 12).color('#f0f0f8').translate(8.5, 11.75, PCB_T + 1.15);
// Contact pad ring under package (visual underside balls as flat grid)
const balls: Shape[] = [];
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 4; c++) {
    balls.push(
      cylinder(0.12, 0.2, 10)
        .color(CU)
        .translate(8.6 + c * 0.85, 12.0 + r * 1.2, PCB_T - 0.05),
    );
  }
}

const addr = box(2.4, 1.3, 0.2).color(CU).translate(14.5, 20.5, PCB_T);
const ps0 = box(1.8, 1.2, 0.2).color(CU).translate(3.0, 20.5, PCB_T);
const ps1 = box(1.8, 1.2, 0.2).color(CU).translate(5.5, 20.5, PCB_T);
const led = box(1.6, 0.8, 0.5).color(LED).translate(14.5, 6.0, PCB_T);

const caps: Shape[] = [
  box(1.0, 0.5, 0.45).color(PASS).translate(3.5, 8.0, PCB_T),
  box(1.0, 0.5, 0.45).color(PASS).translate(3.5, 10.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(14.5, 9.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(14.5, 12.0, PCB_T),
  box(1.0, 0.5, 0.45).color(PASS).translate(8.5, 20.0, PCB_T),
];

const asm = assembly('bno055');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('bno055-lga', lga);
asm.part('pin1-dot', pin1);
balls.forEach((b, i) => asm.part(`lga-ball-${i}`, b));
asm.part('addr-pad', addr);
asm.part('ps0-pad', ps0);
asm.part('ps1-pad', ps1);
asm.part('pwr-led', led);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
return asm.model();
