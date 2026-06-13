// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// MUSE 'stool' — four-legged CNC-milled timber stool, interlocking joinery.
// 5 independent components: seat panel + 4 legs. Legs carry a square tenon
// on top; the seat panel carries matching sockets cut into its bottom face
// with assembly clearance (socket > tenon) so the assembled model is
// interference-free while staying a tight interference-style fit in spirit.

// Spec defaults (mm). seat_half_size raised to 250 within its documented
// range so the assembled envelope matches the stated 500 x 500 x 415 overall.
const seatCornerRadius = 10;
const legCornerRadius = 3;

const LH = 400, SHS = 250, ST = 15, LHS = 20;
// Leg centers: inset from the seat edge by one leg half-size + 10 mm margin.
const inset = LHS + 10;
const cx = SHS - inset; // 220 mm from center

const stool = assembly('stool');

// --- Seat panel: rounded-rect plate with four bottom sockets -------------
// extrudeRoundedRect is center-anchored in XY, base at z=0.
const seatPlate = extrudeRoundedRect(2 * SHS, 2 * SHS, seatCornerRadius, ST)
  .translate(0, 0, LH);
const socketCenters: [number, number][] = [
  [cx, cx], [-cx, cx], [cx, -cx], [-cx, -cx],
];
let seatShape = seatPlate;
for (const [sx, sy] of socketCenters) {
  // Socket: rectangular pocket cut upward into the bottom face.
  const socket = box(2 * 5.2, 2 * 5.2, 7.7, true).translate(sx, sy, LH + 7.7 / 2 - 0.01);
  seatShape = seatShape.subtract(socket);
}
const seat = stool.part('seat_panel', seatShape.color('plate'));

// --- Legs: rounded-square column + top tenon ------------------------------
function makeLeg(lx: number, ly: number) {
  const column = extrudeRoundedRect(2 * LHS, 2 * LHS, legCornerRadius, LH); // center-anchored
  // Tenon stops 0.2 mm short of the socket floor (socket 7.7 vs tenon 7.5).
  const tenon = box(2 * 5, 2 * 5, 7.5, true).translate(0, 0, LH + 7.5 / 2);
  return column.union(tenon).translate(lx, ly, 0).color('beam');
}

const legNames = [
  ['front_left_leg', -cx, -cx],
  ['front_right_leg', cx, -cx],
  ['rear_left_leg', -cx, cx],
  ['rear_right_leg', cx, cx],
] as const;

for (const [name, lx, ly] of legNames) {
  const leg = stool.part(name, makeLeg(lx, ly));
  // Connector pair at the tenon/socket interface (seat-bottom plane).
  leg.connector('tenon-top', { type: 'frame', origin: { kind: 'vec3', value: [lx, ly, LH] }, axis: [0, 0, 1] });
  seat.connector(`socket-${name}`, { type: 'frame', origin: { kind: 'vec3', value: [lx, ly, LH] }, axis: [0, 0, 1] });
  stool.mate(`${name}-to-seat`, `seat_panel.socket-${name}`, `${name}.tenon-top`, 'fastened');
}

return stool.solvedModel({});
