// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Precision Microdrives 304-002 Pico Vibe ERM vibration motor.
//
// DIMENSION SOURCE — Precision Microdrives 304-002 product data sheet,
// R002-V005 (manufacturer):
// https://precisionmicrodrives.com/cdn/catalog_product/bcf5120d-7432-43cc-b86b-8f7bb4e9e73/304-002-datasheet.pdf
//
// Confirmed nominal package data:
//   motor-body diameter  4.0 mm +/-0.2 mm
//   motor-body length    8.0 mm +/-0.2 mm
//   eccentric-weight radius 2.0 mm +/-0.2 mm
//   eccentric-weight length 3.0 mm +/-0.2 mm
//   rated voltage        3 V
//
// The vendor datasheet supplies an outline rather than a licensed detailed
// solid. This source deliberately models that documented mechanical envelope:
// the cylindrical motor can, its two end caps, and the offset weight are named
// physical sub-parts. Flexible lead length is not made into a rigid body;
// route it in the enclosing assembly once the purchased lead variant is known.
// X is the motor axis, and the body centre is the origin so `recenter()` and
// catalog placement have a stable, reusable mounting frame.

const BODY_DIAMETER_MM = 4.0;
const BODY_LENGTH_MM = 8.0;
const BODY_TOLERANCE_MM = 0.2;
const END_CAP_LENGTH_MM = 0.2;
const WEIGHT_RADIUS_MM = 2.0;
const WEIGHT_LENGTH_MM = 3.0;
const WEIGHT_TOLERANCE_MM = 0.2;
const TERMINAL_PAD_LENGTH_MM = 0.35;
const TERMINAL_PAD_WIDTH_MM = 0.45;
const TERMINAL_PAD_HEIGHT_MM = 0.25;

const CAN = '#3f4348';
const CAP = '#8b929b';
const MASS = '#707882';
const CONTACT = '#d4a64a';

// Use the upper bound of each published tolerance for the solid envelope.
// A user placing it can then reserve a real production fit, not just nominal.
const bodyEnvelopeDiameterMm = BODY_DIAMETER_MM + BODY_TOLERANCE_MM;
const bodyEnvelopeLengthMm = BODY_LENGTH_MM + BODY_TOLERANCE_MM;
const weightEnvelopeRadiusMm = WEIGHT_RADIUS_MM + WEIGHT_TOLERANCE_MM;
const weightEnvelopeLengthMm = WEIGHT_LENGTH_MM + WEIGHT_TOLERANCE_MM;
const bodyRadius = bodyEnvelopeDiameterMm / 2;
const bodyStartX = -bodyEnvelopeLengthMm / 2;
const frontCapStartX = bodyStartX - END_CAP_LENGTH_MM;
const weightStartX = bodyEnvelopeLengthMm / 2 + END_CAP_LENGTH_MM;

// The motor can and both end caps use the manufacturer’s body diameter. The
// off-axis weight occupies the documented 3 mm axial envelope without claiming
// unprovided internal rotor detail.
const motorCan = cylinder(bodyEnvelopeLengthMm, bodyRadius, 48)
  .alongAxis([1, 0, 0])
  .translate(bodyStartX, 0, 0)
  .color(CAN);
const frontEndCap = cylinder(END_CAP_LENGTH_MM, bodyRadius, 48)
  .alongAxis([1, 0, 0])
  .translate(frontCapStartX, 0, 0)
  .color(CAP);
const rearEndCap = cylinder(END_CAP_LENGTH_MM, bodyRadius, 48)
  .alongAxis([1, 0, 0])
  .translate(bodyEnvelopeLengthMm / 2, 0, 0)
  .color(CAP);
const eccentricMass = cylinder(weightEnvelopeLengthMm, weightEnvelopeRadiusMm, 48)
  .alongAxis([1, 0, 0])
  .translate(weightStartX, 0, 0)
  .color(MASS);

// Two small, named contact exits identify the electrical interface without
// pretending that the 45 mm flexible leads are a fixed mechanical keep-out.
const positiveLeadExit = box(
  TERMINAL_PAD_LENGTH_MM,
  TERMINAL_PAD_WIDTH_MM,
  TERMINAL_PAD_HEIGHT_MM,
  true,
)
  .translate(frontCapStartX - TERMINAL_PAD_LENGTH_MM / 2, 0.8, 0)
  .color(CONTACT);
const negativeLeadExit = box(
  TERMINAL_PAD_LENGTH_MM,
  TERMINAL_PAD_WIDTH_MM,
  TERMINAL_PAD_HEIGHT_MM,
  true,
)
  .translate(frontCapStartX - TERMINAL_PAD_LENGTH_MM / 2, -0.8, 0)
  .color(CONTACT);

const actuator = assembly('precision-microdrives-304-002-erm');
actuator.part('motor-can', motorCan);
actuator.part('front-end-cap', frontEndCap);
actuator.part('rear-end-cap', rearEndCap);
actuator.part('eccentric-mass-envelope', eccentricMass);
actuator.part('positive-lead-exit', positiveLeadExit);
actuator.part('negative-lead-exit', negativeLeadExit);

return actuator.model();
