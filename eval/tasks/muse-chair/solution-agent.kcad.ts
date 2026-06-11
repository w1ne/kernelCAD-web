// MUSE 'chair' — four-legged dining chair with backrest, CNC timber,
// interlocking joinery. 6 independent components: seat panel, 4 legs,
// backrest panel. Legs carry top tenons into seat-bottom sockets; the
// backrest carries a full-width strip tenon pressed down into a rear slot.
// Sockets/slots are cut with assembly clearance so the assembled model is
// interference-free.

// Spec defaults (mm).
const W = 400;            // width (x)
const D = 400;            // depth (y)
const SEAT_H = 450;       // seat height (top of legs / bottom of seat)
const BACK_H = 400;       // backrest height above the seat top
const LEG_T = 40;         // leg thickness (square cross-section)
const SEAT_T = 30;        // seat panel thickness
const TENON = 13.5;       // tenon bite depth
const TENON_OFF = 5;      // tenon setback from part edge
const CLR = 0.2;          // assembly clearance per side
const BACK_T = 20;        // backrest panel thickness

const chair = assembly('chair');

// Leg centers: inset from the seat edge by half a leg.
const cx = W / 2 - LEG_T / 2; // 180
const cy = D / 2 - LEG_T / 2; // 180
const legCenters = [
  ['front_left_leg', -cx, -cy],
  ['front_right_leg', cx, -cy],
  ['rear_left_leg', -cx, cy],
  ['rear_right_leg', cx, cy],
] as const;

// Tenon cross-section: leg cross-section minus the setback all around.
const tenonHalf = LEG_T / 2 - TENON_OFF; // 15

// --- Seat panel: plate with four leg sockets + rear backrest slot --------
let seatShape = box(W, D, SEAT_T, true).translate(0, 0, SEAT_H + SEAT_T / 2);
for (const [, lx, ly] of legCenters) {
  const socket = box(2 * (tenonHalf + CLR), 2 * (tenonHalf + CLR), TENON + CLR, true)
    .translate(lx, ly, SEAT_H + (TENON + CLR) / 2 - 0.01);
  seatShape = seatShape.subtract(socket);
}
// Backrest slot: full-width strip near the rear edge, cut down from the top.
const backY = D / 2 - BACK_T / 2 - 10; // slot center, 10 mm in from rear edge
const slot = box(W - 2 * TENON_OFF + 2 * CLR, BACK_T + 2 * CLR, TENON + CLR, true)
  .translate(0, backY, SEAT_H + SEAT_T - (TENON + CLR) / 2 + 0.01);
seatShape = seatShape.subtract(slot);
const seat = chair.part('seat_panel', seatShape.color('plate'));

// --- Legs: square column + top tenon -------------------------------------
for (const [name, lx, ly] of legCenters) {
  const column = box(LEG_T, LEG_T, SEAT_H, true).translate(0, 0, SEAT_H / 2);
  const tenon = box(2 * tenonHalf, 2 * tenonHalf, TENON, true)
    .translate(0, 0, SEAT_H + TENON / 2);
  const leg = chair.part(name, column.union(tenon).translate(lx, ly, 0).color('beam'));
  leg.connector('tenon-top', { type: 'frame', origin: { kind: 'vec3', value: [lx, ly, SEAT_H] }, axis: [0, 0, 1] });
  seat.connector(`socket-${name}`, { type: 'frame', origin: { kind: 'vec3', value: [lx, ly, SEAT_H] }, axis: [0, 0, 1] });
  chair.mate(`${name}-to-seat`, `seat_panel.socket-${name}`, `${name}.tenon-top`, 'fastened');
}

// --- Backrest: panel with bottom strip tenon ------------------------------
const seatTop = SEAT_H + SEAT_T; // 480
const backPanel = box(W, BACK_T, BACK_H, true)
  .translate(0, backY, seatTop + BACK_H / 2);
const stripTenon = box(W - 2 * TENON_OFF, BACK_T, TENON, true)
  .translate(0, backY, seatTop - TENON / 2);
const backrest = chair.part('backrest_panel', backPanel.union(stripTenon).color('frame'));
backrest.connector('strip-tenon', { type: 'frame', origin: { kind: 'vec3', value: [0, backY, seatTop] }, axis: [0, 0, -1] });
seat.connector('back-slot', { type: 'frame', origin: { kind: 'vec3', value: [0, backY, seatTop] }, axis: [0, 0, -1] });
chair.mate('backrest-to-seat', 'seat_panel.back-slot', 'backrest_panel.strip-tenon', 'fastened');

return chair.solvedModel({});
