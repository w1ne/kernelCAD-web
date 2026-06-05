// Spice Dispenser "Revolver" — DISC-VALVE VARIANT.
//
// Same six-shooter dispenser as spice-revolver.kcad.ts, but the dosing
// mechanism is a rotating VALVE DISC flush in the base top instead of the
// tap tube. Best for fine, free-flowing spices: the disc IS the chamber
// floor (zero standing channel, zero residue) and each cycle meters a fixed
// ~0.2 ml dose. The tube variant pours faster and suits coarse/flaky spices.
//   • servo-rotate  — output spline couples DIRECTLY into the drum, clamped by a
//                     screw into the spline's screw-point; indexes the 6 chambers.
//   • servo-doser   — shaft up under the base, SAME integrated pattern as
//                     servo-rotate. It turns a Ø24 valve DISC sitting flush
//                     in the base top — the disc IS the chamber floor, so
//                     spice rests directly on it (no channel, no residue,
//                     nothing breaks either surface). A 5×8.5 mm slot pocket
//                     through the disc fills under the chamber at 0°, rides
//                     sealed under the drum face, and drops the dose through
//                     the bottom outlet at 90°. `doserAngleDeg` poses it.
//
// Geometry blockout — joints/motion are the next step. Servos are MG90S modeled
// to datasheet (swap a vendor STEP via lib.fromSTEP for exact geometry).

// ── Dimensions (mm) ────────────────────────────────────────────────────────
const N_CHAMBERS = 6;
const BASE_R     = 38;          // Ø76 — drum and base share this diameter (one clean cylinder)
const DRUM_R     = BASE_R;      // drum flush with the base
const DRUM_H     = 55;
const CHAMBER_R  = 9;           // Ø18 spice chambers
const BOLT_R     = 24;          // chambers on a Ø48 bolt circle
const DISP_X     = BOLT_R;      // dispensing hole at chamber radius, angle 0

const BASE_T   = 10;           // slim disc that fully swallows the valve disc + its seat
const DRUM_Z0  = BASE_T;
const DRUM_Z1  = DRUM_Z0 + DRUM_H;

const LID_T       = 5;
const LID_SKIRT_H = 8;          // skirt grips the drum top → the cap actually mounts
const KNOB_R      = 7;
const KNOB_H      = 12;
const LID_Z0      = DRUM_Z1;     // cap sits ON the drum top, skirt down over the rim

// ── MG90S metal-gear 9 g servo (TowerPro), modeled to datasheet ────────────
// Built shaft-up (+Z), case base at z=0, centred in X/Y; output spline OFFSET.
const MG_L = 22.8, MG_W = 12.2, MG_H = 22.5;
const MG_FLANGE_L = 32.2, MG_FLANGE_T = 2.5, MG_FLANGE_Z = 16.0;
const MG_HOLE_SPACING = 28, MG_HOLE_R = 1.0;
const MG_SHAFT_X = -MG_L / 2 + 6;
function mg90s() {
  const caseBody = box(MG_L, MG_W, MG_H, true).translate(0, 0, MG_H / 2).color('servo');
  const flangeBlank = box(MG_FLANGE_L, MG_W, MG_FLANGE_T, true).translate(0, 0, MG_FLANGE_Z + MG_FLANGE_T / 2);
  const holeA = cylinder(MG_FLANGE_T + 2, MG_HOLE_R, 16).translate(MG_HOLE_SPACING / 2, 0, MG_FLANGE_Z - 1);
  const holeB = cylinder(MG_FLANGE_T + 2, MG_HOLE_R, 16).translate(-MG_HOLE_SPACING / 2, 0, MG_FLANGE_Z - 1);
  const flange = flangeBlank.subtract(holeA, holeB).color('servo');
  const boss   = cylinder(2, 3, 24).translate(MG_SHAFT_X, 0, MG_H).color('servo');
  // Output spline with the central SCREW POINT on top.
  const spline = cylinder(4, 2.45, 16).translate(MG_SHAFT_X, 0, MG_H + 2)
    .subtract(cylinder(3, 1, 12).translate(MG_SHAFT_X, 0, MG_H + 3)).color('shaft');
  const cable  = cylinder(5, 1.6, 12).alongAxis([1, 0, 0]).translate(MG_L / 2, 0, 5).color('#222222');
  return caseBody.union(flange, boss, spline, cable);
}
// Seat an MG90S shaft-up with its OUTPUT SPLINE on (x, y), flange top at z=0
// (mounts to the base underside), body hanging below. The case length runs along
// Y (narrow, 12.2 mm, in X) so two servos pack side by side in X. After the 90°
// turn the spline sits at local (0, MG_SHAFT_X); placing it at (x, y) puts the
// case centre at (x, y − MG_SHAFT_X).
function mountServo(x, y, dz) {
  return mg90s().rotate([0, 0, 1], 90).translate(x, y - MG_SHAFT_X, dz === undefined ? -18.5 : dz);
}

// ── Drum (rotating revolver head) ──────────────────────────────────────────
const chamber  = cylinder(DRUM_H + 2, CHAMBER_R, 32).translate(BOLT_R, 0, -1);
const chambers = chamber.patternCircular({ count: N_CHAMBERS, axis: [0, 0, 1] });
// Central coupling: the servo spline drops into a Ø5.4 socket on a short downward
// hub; a clamp screw runs down the Ø7 channel from the top into the spline's
// screw-point. The drum IS its own horn.
const hubSleeve    = cylinder(5, 4, 32).translate(0, 0, -2).color('#b8862b');
const splineSocket = cylinder(DRUM_H, 2.7, 32).translate(0, 0, -2);
const driverBore   = cylinder(DRUM_H, 3.5, 32).translate(0, 0, 9);
// Counterbore so the servo's Ø6 output boss (z 4..6 world) clears the hub
// sleeve — the socket grips the spline only, never the boss.
const bossBore     = cylinder(3, 3.3, 32).translate(0, 0, -3);
const drum = cylinder(DRUM_H, DRUM_R, 96)
  .color('#b8862b')
  .union(hubSleeve)
  .subtract(chambers, splineSocket, driverBore, bossBore)
  .translate(0, 0, DRUM_Z0);
const clampScrew = cylinder(8, 1, 16).translate(0, 0, DRUM_Z0 + 2)
  .union(cylinder(2, 2.2, 16).translate(0, 0, DRUM_Z0 + 10)).color('#cccccc');

// ── Doser — rotating valve disc flush in the base top ───────────────────────
// A Ø24.4 × 5 disc seated in a pocket in the base top, its top face COPLANAR
// with the base top: the disc IS the floor of the active chamber, so spice
// rests directly on it — zero standing channel, zero residue. A 5 × 8.5 mm
// slot pocket punches through the disc at orbit radius 7: at 0° it sits
// under the chamber and fills (~0.2 ml); turning toward 90° it rides sealed
// under the drum face, then meets the bottom outlet — the dose drops free.
const doserAngleDeg = param('doserAngleDeg', 0, {
  min: 0, max: 90, description: 'Valve disc angle — 0 fills the pocket under the chamber, 90 drops the dose',
});
const VALVE_X = 17;                              // disc axis (x, 0) — orbit r7 reaches the chamber at (24, 0)
const dosePocket = box(3.5, 5, 7).translate(22.5, -2.5, 4)
  .union(cylinder(7, 2.5, 24).translate(22.5, 0, 4), cylinder(7, 2.5, 24).translate(26, 0, 4));
const doser = cylinder(5, 12.2, 64).translate(VALVE_X, 0, 5)       // disc z 5..10, top flush with the base top
  .union(cylinder(1.5, 4, 32).translate(VALVE_X, 0, 3.5))          // drive hub under the disc (clears the servo case top at z 3.2)
  .subtract(
    dosePocket,
    cylinder(7, 2.6, 16).translate(VALVE_X, 0, 2.4),               // spline socket (blind 0.6 below the disc top)
    cylinder(3, 3.3, 24).translate(VALVE_X, 0, 2.3),               // counterbore clears the servo's Ø6 boss collar
  )
  .rotate([0, 0, -1], doserAngleDeg, [VALVE_X, 0, 0])              // + slider turns the slot toward the outlet at -Y
  .color('tool');

// ── Base (Ø76, flush with the drum; houses both servos) ────────────────────
// The rotation servo flange-mounts to a recess on the underside, spline up the
// centre into the drum. The dispensing path runs chamber → disc pocket →
// outlet, gated by the rotating disc.
const basePlate = cylinder(BASE_T, BASE_R, 96);
// Valve-disc seat: a Ø25 pocket sunk 5.2 into the base TOP holds the disc
// (0.3 running clearance, 0.2 below the disc bottom). The chamber floor over
// the disc is the disc itself; the only break in the underside is the outlet.
const valveSeat  = cylinder(5.4, 12.5, 64).translate(VALVE_X, 0, 4.8);
const valveWell  = cylinder(7, 4.5, 32).translate(VALVE_X, 0, -2);   // hub + spline passage to the servo below
const outlet     = cylinder(7, 2.75, 32).translate(VALVE_X, -10, -1); // Ø5.5 drop hole at the disc's 90° station
// Case centre Y for an MG90S mounted shaft-up (spline offset within the case).
const ROT_CCY = 0 - MG_SHAFT_X;            // rotation case centre Y (X = 0)
// Rotation servo: recess at its case, Ø10 shaft passage on the drum axis, M2 holes.
const rotRecess = box(16, 27, 7, true).translate(0, ROT_CCY, 3.5);
const rotShaft  = cylinder(BASE_T + 4, 5, 32).translate(0, 0, -2);
const rotScrewA = cylinder(BASE_T + 2, 1.1, 16).translate(0, ROT_CCY + 14, -1);
const rotScrewB = cylinder(BASE_T + 2, 1.1, 16).translate(0, ROT_CCY - 14, -1);
// Doser servo: same recess + screw pattern as the rotation servo, centred
// under the valve disc at (VALVE_X, 0).
const dsrRecess = box(16, 24, 7, true).translate(VALVE_X, 5.7, 3.5);
const dsrScrewA = cylinder(5, 1.1, 16).translate(VALVE_X, ROT_CCY + 14, -1);
const dsrScrewB = cylinder(5, 1.1, 16).translate(VALVE_X, ROT_CCY - 14, -1);
const base = basePlate
  .subtract(valveSeat, valveWell, outlet, rotRecess, rotShaft, rotScrewA, rotScrewB, dsrRecess, dsrScrewA, dsrScrewB)
  .color('frame');

// ── Lid — press-on cap (mountable) ─────────────────────────────────────────
// Top disc + a skirt that grips the drum's top rim (push-on / pull-off), so the
// cap actually mounts and rides with the drum. Knob on top.
const lidTop   = cylinder(LID_T, DRUM_R + 2, 96).translate(0, 0, LID_Z0).color('plate');
const lidSkirt = cylinder(LID_SKIRT_H, DRUM_R + 2, 96).translate(0, 0, LID_Z0 - LID_SKIRT_H)
  .subtract(cylinder(LID_SKIRT_H + 2, DRUM_R + 0.3, 96).translate(0, 0, LID_Z0 - LID_SKIRT_H - 1))
  .color('plate');
const knob = cylinder(KNOB_H, KNOB_R, 32).translate(0, 0, LID_Z0 + LID_T).color('plate');
const lid = lidTop.union(lidSkirt, knob);

// ── Servos (both underneath) ────────────────────────────────────────────────
const servoRotate  = mountServo(0, 0);                      // shaft up, spline into the drum
// Doser servo: vertical, shaft up into the valve disc's hub socket —
// mirror-image mounting of the drum's rotation servo, fully under the base.
const servoDoser = mountServo(VALVE_X, 0, -19.3);

// ── Assembly ────────────────────────────────────────────────────────────────
const asm = assembly('spice-revolver-disc-valve');
asm.part('base', base);
asm.part('drum', drum);
asm.part('lid', lid);
asm.part('doser', doser);
asm.part('servo-rotate', servoRotate);
asm.part('servo-doser', servoDoser);
asm.part('clamp-screw', clampScrew);

return asm.model();
