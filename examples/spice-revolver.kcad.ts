// Spice Dispenser "Revolver" — sketch iteration 3.
//
// A six-shooter-style spice dispenser sized to the hand (Ø50 drum). The rotating
// drum carries six chambers; a removable cap closes the open top; the base under
// the drum has ONE dispensing hole gated by a rotary shutter. BOTH TowerPro MG90S
// servos mount underneath the base, shafts up:
//   • servo-rotate  — output spline couples DIRECTLY into the drum, clamped by a
//                     screw into the spline's screw-point; indexes the 6 chambers.
//   • servo-doser   — shaft HORIZONTAL, half-recessed under the base: turns a
//                     Ø9 metering TUBE sunk into the base under the exit,
//                     exactly like a tap. A 5.6×11.6 mm slot straight through
//                     the tube lines up chamber→outlet at 90° (open pour) and
//                     the solid tube seals at 0°. `doserAngleDeg` poses it.
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

const BASE_T   = 10;           // slim disc that fully swallows the Ø8.6 tap-barrel bore (top tangent to the chamber floor)

const LID_T       = 5;
const LID_SKIRT_H = 8;          // skirt grips the drum top → the cap actually mounts
const KNOB_R      = 7;
const KNOB_H      = 12;

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
// Drum geometry is authored in the drum's JOINT-LOCAL frame (origin on the
// drum axis at the base top) — its world placement comes from the revolute
// mate on `base.drumAxis`, so the drum-index pose rotates it for free.
const drum = cylinder(DRUM_H, DRUM_R, 96)
  .color('#b8862b')
  .union(hubSleeve)
  .subtract(chambers, splineSocket, driverBore, bossBore);
// Clamp screw rides the drum (fastened mate) — authored in the same frame.
const clampScrew = cylinder(8, 1, 16).translate(0, 0, 2)
  .union(cylinder(2, 2.2, 16).translate(0, 0, 10)).color('#cccccc');

const DOSER_Z = 1.5;                             // tap tube axis: along Y under the exit, sunk into the disc

// ── Base (Ø76, flush with the drum; houses both servos) ────────────────────
// The rotation servo flange-mounts to a recess on the underside, spline up the
// centre into the drum. The dispensing path runs chamber → Ø5.6 inlet → tap
// barrel → Ø5.6 outlet, gated by the rotating barrel.
const basePlate = cylinder(BASE_T, BASE_R, 96);
// Tap valve sunk INTO the base: Ø14 bore along Y at z=+1.5 — sized for the
// ~1 ml scoop tube; mostly inside the disc, with a shallow Ø15 valve lip
// below. The bore is PROPERLY CLOSED: blind at +Y and capped by a 1.1 mm
// end wall at -Y — the only penetration is a Ø6.6 shaft hole for the servo
// coupling (boss + spline pass through with 0.3 mm radial clearance), so no
// spice can escape past the tube ends. Inlet and outlet are 9 × 15 mm
// capsule slots matching the tube's scoop mouth so coarse spice pours freely.
const valveBody = cylinder(20.5, 7.5, 48).alongAxis([0, 1, 0]).translate(DISP_X, -12, DOSER_Z);
const valveBore = cylinder(19.1, 7, 48).alongAxis([0, 1, 0]).translate(DISP_X, -10.9, DOSER_Z);
const shaftHole = cylinder(2.5, 3.3, 24).alongAxis([0, 1, 0]).translate(DISP_X, -12.5, DOSER_Z);
const inlet = box(9, 6, 5).translate(19.5, -3, 5.5)
  .union(cylinder(5, 4.5, 32).translate(DISP_X, -3, 5.5), cylinder(5, 4.5, 32).translate(DISP_X, 3, 5.5));
const outlet = box(9, 6, 3).translate(19.5, -3, -7)
  .union(cylinder(3, 4.5, 32).translate(DISP_X, -3, -7), cylinder(3, 4.5, 32).translate(DISP_X, 3, -7));
// Case centre Y for an MG90S mounted shaft-up (spline offset within the case).
const ROT_CCY = 0 - MG_SHAFT_X;            // rotation case centre Y (X = 0)
// Rotation servo: recess at its case, Ø10 shaft passage on the drum axis, M2 holes.
const rotRecess = box(16, 27, 7, true).translate(0, ROT_CCY, 3.5);
const rotShaft  = cylinder(BASE_T + 4, 5, 32).translate(0, 0, -2);
const rotScrewA = cylinder(BASE_T + 2, 1.1, 16).translate(0, ROT_CCY + 14, -1);
const rotScrewB = cylinder(BASE_T + 2, 1.1, 16).translate(0, ROT_CCY - 14, -1);
// Doser-servo recess: the coaxial servo's upper half sinks into the
// underside (case top z=7.6; 2.4 mm roof remains). Mount pillars span the
// recess roof down past the flange ears; M2 screws run along Y into them.
const dsrRecess = box(33.2, 22.9, 7.9).translate(2, -35, 0);      // stops at y=-12.1 so it never cuts the bore's end wall
const dsrMountA = box(4, 2.5, 15.4).translate(2.6, -15.9, -7.5);  // pillar at ear x=+4.6
const dsrMountB = box(4, 2.5, 15.4).translate(30.6, -15.9, -7.5); // pillar at ear x=+32.6
const dsrBoreA  = cylinder(5, 1.0, 16).alongAxis([0, 1, 0]).translate(4.6, -18.7, DOSER_Z);
const dsrBoreB  = cylinder(5, 1.0, 16).alongAxis([0, 1, 0]).translate(32.6, -18.7, DOSER_Z);
const base = basePlate
  .union(valveBody)
  .subtract(valveBore, shaftHole, inlet, outlet, rotRecess, rotShaft, rotScrewA, rotScrewB, dsrRecess)
  .union(dsrMountA, dsrMountB)
  .subtract(dsrBoreA, dsrBoreB)
  .color('frame');

// ── Lid — press-on cap (mountable) ─────────────────────────────────────────
// Top disc + a skirt that grips the drum's top rim (push-on / pull-off), so the
// cap actually mounts and rides with the drum (fastened mate to the drum top).
// Authored in the lid's joint-local frame: origin at the drum-top seat.
const lidTop   = cylinder(LID_T, DRUM_R + 2, 96).color('plate');
const lidSkirt = cylinder(LID_SKIRT_H, DRUM_R + 2, 96).translate(0, 0, -LID_SKIRT_H)
  .subtract(cylinder(LID_SKIRT_H + 2, DRUM_R + 0.3, 96).translate(0, 0, -LID_SKIRT_H - 1))
  .color('plate');
const knob = cylinder(KNOB_H, KNOB_R, 32).translate(0, 0, LID_T).color('plate');
const lid = lidTop.union(lidSkirt, knob);

// ── Servos (both underneath) ────────────────────────────────────────────────
const servoRotate  = mountServo(0, 0);                      // shaft up, spline into the drum
// Doser servo lies on its SIDE, half-recessed: flip the spline offset to +X
// (z-180), then lay the shaft horizontal pointing +Y (x-rot -90). The spline
// runs up the open -Y end of the valve bore into the tube's coupling bore.
const servoDoser = mg90s()
  .rotate([0, 0, 1], 180)
  .rotate([1, 0, 0], -90)
  .translate(DISP_X - 5.4, -34.7, DOSER_Z);

// ── Doser — rotating tap tube with a BLIND scoop (dose-by-dose) ──────────────
// A Ø13.4 tube lies along Y in the Ø14 bore (axis z=+1.5, coaxial with the
// half-recessed servo). The 9 × 15 mm capsule scoop is BLIND — closed on the
// far side — so the tap doses part by part: at 0° the mouth faces UP and
// fills (~1 ml) from the chamber; swing to 180° and the mouth faces DOWN
// over the outlet — exactly one scoop drops. In between, the solid tube
// back seals chamber and outlet simultaneously (airlock). Bigger doses are
// cycles: 1 tsp ≈ 5 flips, 1 tbsp ≈ 14 flips — the servo does that in
// seconds.
//
// The tube is authored in its JOINT-LOCAL frame (origin on the tap axis);
// its world placement AND rotation come from the `tap` revolute mate, whose
// pose is the `doserAngleDeg` param — so a slider edit is a pose-only
// re-solve, no boolean recompute at all.
const doserAngleDeg = param('doserAngleDeg', 0, {
  min: 0, max: 180, description: 'Tap tube angle — 0 fills the scoop, 180 drops the dose',
});
const drumIndexDeg = param('drumIndexDeg', 0, {
  min: 0, max: 360, description: 'Drum index — 60° per chamber',
});
const doseScoop = box(9, 6, 11.5).translate(-4.5, -3, -4.5)
  .union(
    cylinder(11.5, 4.5, 32).translate(0, -3, -4.5),
    cylinder(11.5, 4.5, 32).translate(0, 3, -4.5),
  );
const doser = cylinder(18, 6.7, 48).alongAxis([0, 1, 0]).translate(0, -10.8, 0)
  .subtract(
    doseScoop,                                                                // 9×15 blind scoop, mouth up at pose 0°
    cylinder(5.5, 2.6, 16).alongAxis([0, 1, 0]).translate(0, -10.85, 0),      // servo-spline coupling bore
    cylinder(1.2, 3.3, 24).alongAxis([0, 1, 0]).translate(0, -10.85, 0),      // counterbore clears the servo's Ø6 boss collar
  )
  .color('tool');

// ── Assembly — connectors, joints, posed model ───────────────────────────────
// Both moving parts are proper revolute mates with param-driven poses:
// Studio's Joints tab can drag them in the viewport, and param edits re-pose
// without recomputing any geometry. Static parts are fastened so the
// validator sees a fully-connected mechanism.
const asm = assembly('spice-revolver');
const basePart = asm.part('base', base);
basePart.connector('drumAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, BASE_T] }, axis: [0, 0, 1] });
basePart.connector('tapAxis', { type: 'axis', origin: { kind: 'vec3', value: [DISP_X, 0, DOSER_Z] }, axis: [0, 1, 0] });
basePart.connector('rotMount', { type: 'frame', origin: { kind: 'vec3', value: [0, ROT_CCY, 0] } });
basePart.connector('dsrMount', { type: 'frame', origin: { kind: 'vec3', value: [DISP_X - 5.4, -34.7, DOSER_Z] } });

const drumPart = asm.part('drum', drum);
drumPart.connector('drumAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
drumPart.connector('lidSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, DRUM_H] } });
drumPart.connector('clampSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

const lidPart = asm.part('lid', lid);
lidPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

const doserPart = asm.part('doser', doser);
doserPart.connector('tapAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });

const rotServoPart = asm.part('servo-rotate', servoRotate);
rotServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, ROT_CCY, 0] } });

const dsrServoPart = asm.part('servo-doser', servoDoser);
dsrServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [DISP_X - 5.4, -34.7, DOSER_Z] } });

const clampPart = asm.part('clamp-screw', clampScrew);
clampPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

asm.mate('drum-index', 'base.drumAxis', 'drum.drumAxis', 'revolute', { pose: drumIndexDeg, limitsDeg: [0, 360] });
asm.mate('tap', 'base.tapAxis', 'doser.tapAxis', 'revolute', { pose: doserAngleDeg, limitsDeg: [0, 180] });
asm.mate('lid-fit', 'drum.lidSeat', 'lid.seat', 'fastened');
asm.mate('clamp-fit', 'drum.clampSeat', 'clamp-screw.seat', 'fastened');
asm.mate('rot-servo-fix', 'base.rotMount', 'servo-rotate.mount', 'fastened');
asm.mate('dsr-servo-fix', 'base.dsrMount', 'servo-doser.mount', 'fastened');

return asm.solvedModel({});
