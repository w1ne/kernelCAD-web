// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/soil-moisture.kcad.ts
//
// Capacitive soil moisture probe (corrosion-resistant PCB fork style).
// Overall footprint: 60 x 23 x 6 mm including the probe forks.
// Layout: small green header board (23×15×1.6) with 4-pin header, SOIC
// comparator, and trim pot; two long capacitive fork prongs extending
// downward (the "soil" half, typically a different FR4 mask tone).

const HEAD_L = 23.0; // X width of the electronics head
const HEAD_W = 15.0; // Y depth of the head
const PCB_T = 1.6;

const FORK_L = 8.0;   // each prong width
const FORK_W = 45.0;  // prong length (into the soil, +Y)
const FORK_GAP = 4.0; // gap between prongs

const PCB_GREEN = '#2d6a4f';
const FORK_GREEN = '#95d5b2';
const GOLD = '#c8a040';
const IC_DARK = '#222228';
const PASSIVE = '#7a6040';
const POT_BODY = '#2a2a32';

// Head PCB
const head = box(HEAD_L, HEAD_W, PCB_T).color(PCB_GREEN);

// Full-extent footprint plate (0.2mm) so catalog bbox measures the whole probe,
// not a single fork solid. Sits under the PCB plane.
const FOOT_L = HEAD_L;
const FOOT_W = HEAD_W + FORK_W;
const footprint = box(FOOT_L, FOOT_W, 0.2).color(FORK_GREEN).translate(0, 0, -0.2);

// Two capacitive forks extending in +Y from the head
const totalForkSpan = FORK_L * 2 + FORK_GAP;
const forkStartX = (HEAD_L - totalForkSpan) / 2;
const forkLeft = box(FORK_L, FORK_W, PCB_T)
  .color(FORK_GREEN)
  .translate(forkStartX, HEAD_W, 0);
const forkRight = box(FORK_L, FORK_W, PCB_T)
  .color(FORK_GREEN)
  .translate(forkStartX + FORK_L + FORK_GAP, HEAD_W, 0);

// Capacitive traces (gold-ish strips on each fork face)
const traceL = box(FORK_L - 2.0, FORK_W - 4.0, 0.15)
  .color(GOLD)
  .translate(forkStartX + 1.0, HEAD_W + 2.0, PCB_T);
const traceR = box(FORK_L - 2.0, FORK_W - 4.0, 0.15)
  .color(GOLD)
  .translate(forkStartX + FORK_L + FORK_GAP + 1.0, HEAD_W + 2.0, PCB_T);

// 4-pin header on -Y edge of the head
const pinCount = 4;
const pinPitch = 2.54;
const headerW = (pinCount - 1) * pinPitch + 2.5;
const headerX = (HEAD_L - headerW) / 2;
const headerBody = box(headerW, 2.5, 2.5).color('#1a1a28').translate(headerX, -2.5, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < pinCount; i++) {
  const px = headerX + 1.25 + i * pinPitch;
  pins.push(box(0.6, 6.0, 0.6).color(GOLD).translate(px, -6.0, PCB_T + 0.9));
}

// SOIC comparator / oscillator
const soic = box(5.0, 4.0, 1.5).color(IC_DARK).translate(3.0, 5.0, PCB_T);

// Threshold trim pot
const pot = cylinder(2.0, 2.2, 24).color(POT_BODY).translate(16.0, 6.0, PCB_T);
const potKnob = cylinder(0.9, 0.5, 16).color('#888890').translate(16.0, 6.0, PCB_T + 2.2);

// Passives
const caps: Shape[] = [];
for (const [cx, cy] of [[9.0, 4.0], [9.0, 6.5], [11.5, 4.0]] as [number, number][]) {
  caps.push(box(1.6, 0.8, 0.5).color(PASSIVE).translate(cx, cy, PCB_T));
}

const asm = assembly('soil-moisture');
asm.part('footprint-plate', footprint);
asm.part('head-pcb', head);
asm.part('fork-left', forkLeft);
asm.part('fork-right', forkRight);
asm.part('trace-left', traceL);
asm.part('trace-right', traceR);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('soic', soic);
asm.part('trim-pot', pot);
asm.part('trim-knob', potKnob);
caps.forEach((c, i) => asm.part(`cap-${i}`, c));

return asm.model();
