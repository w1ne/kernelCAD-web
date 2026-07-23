// SPDX-License-Identifier: MIT
// 28BYJ-48 geared stepper motor envelope
const body=cylinder(19,14,40).color('#c8ccd0');
const gear=cylinder(8,10,32).color('#94a3b8').translate(0,0,19);
const shaft=cylinder(8,2.5,20).color('#64748b').translate(0,0,27);
const flange=box(18,18,1.5).color('#a8aeb8').translate(-9,-9,0);
const wires=box(6,2,12).color('#1a1a22').translate(-3,12,4);
const asm=assembly('stepper-28byj48');
asm.part('flange',flange); asm.part('body',body); asm.part('gearbox',gear);
asm.part('shaft',shaft); asm.part('cable',wires);
return asm.model();
