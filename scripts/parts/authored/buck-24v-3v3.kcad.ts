// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/buck-24v-3v3.kcad.ts
//
// 24V → 3.3V step-down (buck) regulator breakout module.
// Overall footprint: 18 x 12 x 4 mm.
// Dominant features: shielded power inductor (4×4×3mm), buck controller IC,
// input/output ceramic caps, and a 2-pin screw terminal on each end.

const PCB_L = 18.0;
const PCB_W = 12.0;
const PCB_T = 1.6;

const PCB_BLUE   = '#1a2a4a';
const INDUCTOR   = '#4a4a4a';  // ferrite-shielded inductor
const IC_DARK    = '#1c1c24';
const CAP_YELLOW = '#c8aa20';  // ceramic MLCC (large, yellow-ish)
const ELEC_BLUE  = '#204070';  // electrolytic cap
const PIN_METAL  = '#b8b8b0';
const TERM_GRAY  = '#505060';

// PCB slab
const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB_BLUE);

// Shielded power inductor (4×4×3mm, near center of board)
const inductor = box(4.0, 4.0, 3.0).color(INDUCTOR).translate(7.0, 4.0, PCB_T);

// Buck controller IC (SOP-8, ~5×4×1.2mm, next to inductor)
const ic = box(5.0, 4.0, 1.2).color(IC_DARK).translate(1.5, 4.0, PCB_T);

// Input bulk capacitor (electrolytic 5×5.4mm), near +Y edge
const inputCap = cylinder(3.4, 2.5, 32).color(ELEC_BLUE).translate(13.5, 6.5, PCB_T);
const inputCapTop = box(5.5, 5.5, 0.3).color('#101830').translate(11.2, 4.2, PCB_T + 3.4);

// Output ceramic caps (1206 package, ~3.2×1.6×1.8mm)
const outCap1 = box(3.2, 1.6, 1.8).color(CAP_YELLOW).translate(13.0, 1.5, PCB_T);
const outCap2 = box(3.2, 1.6, 1.8).color(CAP_YELLOW).translate(13.0, 4.0, PCB_T);

// Feedback resistors (0402)
const res: Shape[] = [];
for (const [rx, ry] of [[7.0, 1.0], [9.5, 1.0], [7.0, 10.0]] as [number, number][]) {
  res.push(box(1.0, 0.5, 0.5).color('#8a6040').translate(rx, ry, PCB_T));
}

// 2-pin screw terminal, input end (x=0), 5mm pitch
const termIn = box(11.5, 6.0, 4.0).color(TERM_GRAY).translate(-3.0, 3.0, PCB_T);
const termInSlot1 = box(2.5, 2.5, 3.5).color('#282834').translate(-2.7, 3.2, PCB_T + 0.5);
const termInSlot2 = box(2.5, 2.5, 3.5).color('#282834').translate(-2.7, 7.2, PCB_T + 0.5);
// Screw heads
const screw1 = cylinder(0.5, 1.1, 16).color('#888898').translate(-1.5, 4.4, PCB_T + 3.5);
const screw2 = cylinder(0.5, 1.1, 16).color('#888898').translate(-1.5, 8.4, PCB_T + 3.5);

// 2-pin screw terminal, output end (x=18)
const termOut = box(11.5, 6.0, 4.0).color(TERM_GRAY).translate(PCB_L - 8.5, 3.0, PCB_T);
const termOutSlot1 = box(2.5, 2.5, 3.5).color('#282834').translate(PCB_L + 0.2, 3.2, PCB_T + 0.5);
const termOutSlot2 = box(2.5, 2.5, 3.5).color('#282834').translate(PCB_L + 0.2, 7.2, PCB_T + 0.5);
const screw3 = cylinder(0.5, 1.1, 16).color('#888898').translate(PCB_L + 1.0, 4.4, PCB_T + 3.5);
const screw4 = cylinder(0.5, 1.1, 16).color('#888898').translate(PCB_L + 1.0, 8.4, PCB_T + 3.5);

const asm = assembly('buck-24v-3v3');
asm.part('pcb', pcb);
asm.part('inductor', inductor);
asm.part('buck-ic', ic);
asm.part('input-cap', inputCap);
asm.part('input-cap-top', inputCapTop);
asm.part('output-cap-1', outCap1);
asm.part('output-cap-2', outCap2);
res.forEach((r, i) => asm.part(`resistor-${i}`, r));
asm.part('term-in-body', termIn);
asm.part('term-in-slot-1', termInSlot1);
asm.part('term-in-slot-2', termInSlot2);
asm.part('screw-1', screw1);
asm.part('screw-2', screw2);
asm.part('term-out-body', termOut);
asm.part('term-out-slot-1', termOutSlot1);
asm.part('term-out-slot-2', termOutSlot2);
asm.part('screw-3', screw3);
asm.part('screw-4', screw4);

return asm.model();
