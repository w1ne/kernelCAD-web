// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Luxor Parts 87897 SG90 micro-servo mechanical and cable-interface envelope.
//
// DIMENSION / INTERFACE SOURCE
//   https://www.kjell.com/globalassets/mediaassets/701916_87897_datasheet_en.pdf
//
// The product-specific drawing specifies a 32.0 × 12.4 × 26.7 mm outside
// envelope, a 22.8 mm case dimension, a 250 mm harness, a JR/Futaba/GWS
// connector, 2.54 mm three-way contact pitch, and brown/red/orange
// ground/V+/PWM order. It does *not* dimension a shaft XY datum, horn/spline,
// mould details, cable exit, or connector cross-section. This model therefore
// exports no shaft/mounting mating interface and no fictitious plug housing.
//
// The box is deliberately a conservative mechanical envelope, rather than a
// claim about the detailed mould. It uses a canonical straightened harness pose
// built from documented cable facts. Its endpoint frames are canonical
// plug-contact proxy endpoints at the documented pitch and color/order, not
// literal bare-wire ends or an assertion about installed cable routing.

const ENVELOPE_X = 32.0;
const ENVELOPE_Y = 12.4;
const ENVELOPE_Z = 26.7;

const CABLE_PITCH = 2.54;
const CABLE_LENGTH = 250.0;
// These coordinates put source-backed cable facts into a canonical catalog pose.
// They are not a claim about the product's cable exit or routed shape.
const CABLE_CONTACT_X = ENVELOPE_X + CABLE_LENGTH;
const CABLE_CENTER_Y = ENVELOPE_Y / 2;
const CABLE_Z = ENVELOPE_Z / 2;
// KernelCAD frames need an owning solid. This radius is a canonical
// contact-carrier proxy only, not a claimed conductor or insulation diameter.
const LEAD_PROXY_RADIUS = 0.16;

const SERVO_BLUE = '#2a5e9b';
const BROWN = '#6b4128';
const RED = '#c83030';
const ORANGE = '#e07a22';

const servoEnvelope = box(ENVELOPE_X, ENVELOPE_Y, ENVELOPE_Z)
  .color(SERVO_BLUE);

type Lead = { name: 'ground' | 'vplus' | 'pwm'; color: string; y: number };
const leads: Lead[] = [
  { name: 'ground', color: BROWN, y: CABLE_CENTER_Y - CABLE_PITCH },
  { name: 'vplus', color: RED, y: CABLE_CENTER_Y },
  { name: 'pwm', color: ORANGE, y: CABLE_CENTER_Y + CABLE_PITCH },
];

const asm = assembly('sg90-micro-servo');
asm.part('servo-datasheet-envelope', servoEnvelope);
for (const lead of leads) {
  const leadShape = cylinder(CABLE_LENGTH, LEAD_PROXY_RADIUS, 16)
    .alongAxis([1, 0, 0])
    .translate(ENVELOPE_X, lead.y, CABLE_Z)
    .color(lead.color);
  const leadRef = asm.part(`lead-${lead.name}`, leadShape);
  leadRef.connector(`${lead.name}-contact`, {
    type: 'frame',
    origin: { kind: 'vec3', value: [CABLE_CONTACT_X, lead.y, CABLE_Z] },
    normal: [1, 0, 0],
  });
}

return asm.model();
