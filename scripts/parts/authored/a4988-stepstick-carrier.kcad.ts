// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pololu #2128 A4988 StepStick stepper-motor-driver carrier, Black Edition.
//
// DIMENSION / INTERFACE SOURCES
//   Carrier outline, plated-hole locations, 2.54 mm pitch, and board thickness:
//   https://www.pololu.com/file/0J1081/a4988-stepper-motor-driver-carrier-black-edition-dimension-diagram.pdf
//   Carrier identity, pinout, and header installation option:
//   https://www.pololu.com/product/2128
//   Vendor STEP for fitted-component placement and external envelopes:
//   https://www.pololu.com/file/0J1225/a4988-stepper-motor-driver-carrier-black-edition.step
//   A4988 28-contact QFN package envelope (5 × 5 × 0.90 mm):
//   https://www.allegromicro.com/~/media/files/datasheets/a4988-datasheet.pdf
//
// The board ships with headers supplied but not fitted. This model therefore
// exposes the actual plated through-hole pads, not imaginary installed pins.
// Its connectors are the physical solder/contact faces; no plotter- or
// machine-specific motor/controller abstraction is present.

const PCB_X = 15.24;
const PCB_Y = 20.32;
const PCB_T = 1.57;
const HOLE_D = 1.02;
const PAD_D = 1.70;
const ROW_LEFT_X = 1.27;
const ROW_RIGHT_X = 13.97;
const TOP_PIN_Y = 19.05;
const PIN_PITCH = 2.54;

const PCB_BLACK = '#17191d';
const COPPER = '#c8a040';
const IC_BLACK = '#17171c';
const TRIMMER_BLUE = '#315b8a';

// The official assembled STEP is the placement source for these external
// envelopes. It puts the 5 × 5 mm QFN at (3.342, 8.803) and its 1.00 mm
// assembled height above the PCB; the current-limit trimmer is a 1.5 mm
// radius, 1.15 mm-high envelope at (8.727, 2.7905).
const QFN_X = 3.342;
const QFN_Y = 8.803;
const QFN_H = 1.00;
const TRIMMER_X = 8.727;
const TRIMMER_Y = 2.7905;
const TRIMMER_RADIUS = 1.5;
const TRIMMER_H = 1.15;

type CarrierPin = {
  silkscreen: string;
  part: string;
  connector: string;
  x: number;
  y: number;
};

// The four phase terminals retain their printed labels in `silkscreen`, while
// their authored connector names start with a letter as required by the
// topology-name grammar.
const pins: CarrierPin[] = [
  { silkscreen: 'EN', part: 'contact-en', connector: 'en-contact', x: ROW_LEFT_X, y: TOP_PIN_Y },
  { silkscreen: 'VMOT', part: 'contact-vmot', connector: 'vmot-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y },
  { silkscreen: 'MS1', part: 'contact-ms1', connector: 'ms1-contact', x: ROW_LEFT_X, y: TOP_PIN_Y - PIN_PITCH },
  { silkscreen: 'GND', part: 'contact-gnd-motor', connector: 'gnd-motor-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y - PIN_PITCH },
  { silkscreen: 'MS2', part: 'contact-ms2', connector: 'ms2-contact', x: ROW_LEFT_X, y: TOP_PIN_Y - 2 * PIN_PITCH },
  { silkscreen: '2B', part: 'contact-motor-2b', connector: 'motor-2b-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y - 2 * PIN_PITCH },
  { silkscreen: 'MS3', part: 'contact-ms3', connector: 'ms3-contact', x: ROW_LEFT_X, y: TOP_PIN_Y - 3 * PIN_PITCH },
  { silkscreen: '2A', part: 'contact-motor-2a', connector: 'motor-2a-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y - 3 * PIN_PITCH },
  { silkscreen: 'RESET', part: 'contact-reset', connector: 'reset-contact', x: ROW_LEFT_X, y: TOP_PIN_Y - 4 * PIN_PITCH },
  { silkscreen: '1A', part: 'contact-motor-1a', connector: 'motor-1a-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y - 4 * PIN_PITCH },
  { silkscreen: 'SLEEP', part: 'contact-sleep', connector: 'sleep-contact', x: ROW_LEFT_X, y: TOP_PIN_Y - 5 * PIN_PITCH },
  { silkscreen: '1B', part: 'contact-motor-1b', connector: 'motor-1b-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y - 5 * PIN_PITCH },
  { silkscreen: 'STEP', part: 'contact-step', connector: 'step-contact', x: ROW_LEFT_X, y: TOP_PIN_Y - 6 * PIN_PITCH },
  { silkscreen: 'GND', part: 'contact-gnd-logic', connector: 'gnd-logic-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y - 6 * PIN_PITCH },
  { silkscreen: 'DIR', part: 'contact-dir', connector: 'dir-contact', x: ROW_LEFT_X, y: TOP_PIN_Y - 7 * PIN_PITCH },
  { silkscreen: 'VDD', part: 'contact-vdd', connector: 'vdd-contact', x: ROW_RIGHT_X, y: TOP_PIN_Y - 7 * PIN_PITCH },
];

const platedHoles = pins.map((pin) =>
  cylinder(PCB_T + 2, HOLE_D / 2, 24).translate(pin.x, pin.y, -1),
);
const pcb = box(PCB_X, PCB_Y, PCB_T).subtract(...platedHoles).color(PCB_BLACK);

function contactPad(pin: CarrierPin) {
  // The annular ring is a modeled copper contact on the populated face. It
  // deliberately stays separate from the board body so the interface has a
  // factual owning solid even without an installed header.
  return cylinder(0.08, PAD_D / 2, 32)
    .subtract(cylinder(0.18, HOLE_D / 2, 24).translate(0, 0, -0.05))
    .color(COPPER)
    .translate(pin.x, pin.y, PCB_T);
}

// The package size is data-sheet sourced; its fitted placement is taken from
// the official carrier STEP. No electrical connector is inferred from either.
const a4988Qfn = box(5.0, 5.0, QFN_H)
  .color(IC_BLACK)
  .translate(QFN_X, QFN_Y, PCB_T);

// The vendor STEP establishes this trimmer's external envelope. A separate
// adjustment screw is deliberately omitted because the cited source does not
// provide a distinct, reusable screw geometry for this carrier variant.
const currentLimitTrimmer = cylinder(TRIMMER_H, TRIMMER_RADIUS, 32)
  .color(TRIMMER_BLUE)
  .translate(TRIMMER_X, TRIMMER_Y, PCB_T);

const asm = assembly('a4988-stepstick-carrier');
const pcbRef = asm.part('pcb', pcb);
pcbRef.connector('carrier-solder-face', {
  type: 'frame',
  origin: { kind: 'vec3', value: [PCB_X / 2, PCB_Y / 2, 0] },
  normal: [0, 0, -1],
});
for (const pin of pins) {
  const padRef = asm.part(pin.part, contactPad(pin));
  // A plated pad is annular, but a header or soldered lead mates on its bore
  // axis. This explicit through-hole centerline convention keeps the frame at
  // the factual 1.02 mm drill center while the pad remains its owning copper
  // solid; it does not imply an installed pin.
  padRef.connector(pin.connector, {
    type: 'frame',
    origin: { kind: 'vec3', value: [pin.x, pin.y, PCB_T + 0.08] },
    normal: [0, 0, 1],
  });
}
asm.part('a4988-qfn-envelope', a4988Qfn);
asm.part('current-limit-trimmer', currentLimitTrimmer);

return asm.model();
