// Spice Dispenser — STATIC CHAMBERS + ORBITING SCOOP (v5).
//
// The user-directed architecture: keep the proven SCOOP TUBE doser, and
// make the scoop itself TRAVEL to the selected chamber:
//   • six Ø18 chambers in a STATIC block (the grip body) — nothing heavy
//     rotates and the whole outer surface is fixed
//   • a CARRIAGE orbits in a bay under the block: a sealing disc on top
//     (covers ALL chamber mouths, one Ø12 window over the scoop), the
//     radial scoop tube below it, and the scoop's own micro-servo riding
//     along (wire service loop; azimuth limited to 0..300°)
//   • dose chamber k: drive the carriage to 30°+k·60° — the window opens
//     ONLY that chamber and the spice column fills the scoop (mouth up);
//     drive back to 0° — the solid disc reseals every chamber (you can
//     always NOT dispense); flip the scoop 180° — the ~1 ml dose drops
//     through the floor outlet. No funnel, no shared buffer: the only
//     wetted path is the scoop itself.
//   • carriage servo: static, vertical under the plate (revolver pattern)
//
// Geometry blockout — servos are MG90S modeled to datasheet (swap a vendor
// STEP via lib.fromSTEP for exact geometry).

// ── Dimensions (mm) ────────────────────────────────────────────────────────
const SHELL_R   = 38;          // Ø76 outer silhouette
const BOLT_R    = 24;          // chambers (and the scoop station) on a Ø48 bolt circle
const CHAMBER_R = 9;           // Ø18 spice chambers

const PLATE_T   = 10;          // base plate: floor outlet + carriage servo live here
const BAY_H     = 24;          // carriage bay z 10..34
const BLOCK_Z0  = PLATE_T + BAY_H;      // 34 — chamber block seat
const BLOCK_H   = 55;
const CARR_Z0   = 10.3;        // carriage local origin (hub bottom), 0.3 above the floor
const TUBE_Z    = 13.5;        // scoop-tube axis height in carriage-local coords (world 23.8)

const LID_T       = 5;
const LID_SKIRT_H = 8;
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
// Seat an MG90S shaft-up with its OUTPUT SPLINE on (x, y), flange top at z=0.
function mountServo(x, y, dz) {
  return mg90s().rotate([0, 0, 1], 90).translate(x, y - MG_SHAFT_X, dz === undefined ? -18.5 : dz);
}

// ── Body — base plate + bay shell ring, one static printed part ─────────────
// The plate top is the bay floor: one Ø12 outlet at station 0° (the dose
// drops straight through), a central gallery for the carriage coupling, and
// the carriage servo recessed underneath (revolver pattern).
const plate = cylinder(PLATE_T, SHELL_R, 96);
const ring  = cylinder(BAY_H, SHELL_R, 96).translate(0, 0, PLATE_T)
  .subtract(cylinder(BAY_H + 2, SHELL_R - 3, 96).translate(0, 0, PLATE_T - 1));
const outletChute = cylinder(PLATE_T + 2, 6, 32).translate(BOLT_R, 0, -1);     // Ø12 drop hole, station 0°
const gallery     = cylinder(4, 3.5, 32).translate(0, 0, 7);                   // boss + spline passage to the hub
const ROT_CCY = 0 - MG_SHAFT_X;
const srvRecess = box(16, 33, 7.8).translate(-8, -11.2, 0);    // covers case AND flange wings (servo raised to dz -15)
const srvScrewA = cylinder(PLATE_T + 2, 1.1, 16).translate(0, ROT_CCY + 14, -1);
const srvScrewB = cylinder(PLATE_T + 2, 1.1, 16).translate(0, ROT_CCY - 14, -1);
const body = plate
  .union(ring)
  .subtract(outletChute, gallery, srvRecess, srvScrewA, srvScrewB)
  .color('frame');

// ── Carriage — the orbiting rotor (sealing disc + yoke + hub) ────────────────
// Local frame: origin on the axis at the hub bottom (world z=10.3).
// The Ø64 disc on top seals every chamber mouth except through its one Ø12
// window at the scoop station; the yoke arm drops past the scoop servo to
// the central hub the index servo drives.
const carrDisc   = cylinder(3, 32, 96).translate(0, 0, 20.45);                 // world 30.75..33.75, 0.25 under the block
const carrWindow = cylinder(5, 6, 32).translate(BOLT_R, 0, 19.45);             // Ø12 window over the scoop mouth
const carrArm    = box(10, 6.5, 17.75).translate(-5, -13, 2.7);                // disc → hub, tangentially beside the servo (clears its case at y=-6)
const carrHub    = cylinder(3.6, 7, 32);                                       // world 10.3..13.9 — Ø14 so the yoke arm lands on it
const hubSocket  = cylinder(3.55, 2.6, 16).translate(0, 0, -0.05);             // index-servo spline grips here
// Scoop-servo mount: two tabs hang from the disc behind the flange ears
// (the flange face rests on them at x=11.1); M2 screws run along X through
// the ear holes into the tabs. The servo is now PHYSICALLY mounted to the
// carriage, not just declared fastened.
const srvTabA   = box(1.9, 4.6, 12.45).translate(11.1, -10.8, 8);              // behind ear hole y=-8.6
const srvTabB   = box(1.9, 4.6, 12.45).translate(11.1, 17, 8);                 // behind ear hole y=+19.4
const srvTabBoreA = cylinder(3, 1, 16).alongAxis([1, 0, 0]).translate(10.9, -8.6, TUBE_Z);
const srvTabBoreB = cylinder(3, 1, 16).alongAxis([1, 0, 0]).translate(10.9, 19.4, TUBE_Z);
const carriage = carrDisc
  .union(carrArm, carrHub, srvTabA, srvTabB)
  .subtract(carrWindow, hubSocket, srvTabBoreA, srvTabBoreB)
  .color('gear');

// ── Scoop — the proven tap tube, riding the carriage radially ───────────────
// Identical metering tube to the revolver: Ø13.4, blind 9×15 scoop ≈1 ml,
// mouth up at 0° / drops at 180°. Local frame on its own axis; the mate
// aligns it RADIALLY on the carriage at the Ø48 station.
const doseScoop = box(9, 6, 11.5).translate(-4.5, -3, -4.5)
  .union(
    cylinder(11.5, 4.5, 32).translate(0, -3, -4.5),
    cylinder(11.5, 4.5, 32).translate(0, 3, -4.5),
  );
const doser = cylinder(14.5, 6.7, 48).alongAxis([0, 1, 0]).translate(0, -7.5, 0)
  .subtract(
    doseScoop,
    cylinder(5.5, 2.6, 16).alongAxis([0, 1, 0]).translate(0, -7.55, 0),        // servo-spline coupling bore
    cylinder(1.2, 3.3, 24).alongAxis([0, 1, 0]).translate(0, -7.55, 0),         // counterbore clears the servo's Ø6 boss
  )
  .rotate([0, 0, 1], -90)                                                       // roll axis along +X — must MATCH the carriage connector axis
  .color('tool');

// ── Scoop servo — rides the carriage, coaxial with the radial tube ──────────
// Authored in CARRIAGE-LOCAL coordinates and fastened to the carriage; its
// wires run in a service loop (azimuth travel is limited to 300°).
const servoScoop = mg90s()
  .rotate([0, 0, 1], 90)
  .rotate([0, 1, 0], 90)
  .translate(-7.5, 5.4, TUBE_Z);

// ── Chamber block — the static grip body ────────────────────────────────────
// Local frame: seat on the ring top (world z=34). Chambers at 30°+k·60°
// (station 0° is the drop station, never under a chamber), Ø12 outlets the
// carriage disc seals.
const chamberLocal  = cylinder(52, CHAMBER_R, 32)
  .translate(BOLT_R, 0, 4)
  .rotate([0, 0, 1], 30);
const chambersLocal = chamberLocal.patternCircular({ count: 6, axis: [0, 0, 1] });
const outletLocal   = cylinder(6, 6, 32)
  .translate(BOLT_R, 0, -1)
  .rotate([0, 0, 1], 30);
const outletsLocal  = outletLocal.patternCircular({ count: 6, axis: [0, 0, 1] });
const block = cylinder(BLOCK_H, SHELL_R, 96)
  .subtract(chambersLocal, outletsLocal)
  .color('frame');

// ── Lid — simple press-on cap with a knob ───────────────────────────────────
const lid = cylinder(LID_T, SHELL_R + 2, 96)
  .union(
    cylinder(LID_SKIRT_H, SHELL_R + 2, 96).translate(0, 0, -LID_SKIRT_H)
      .subtract(cylinder(LID_SKIRT_H + 2, SHELL_R + 0.3, 96).translate(0, 0, -LID_SKIRT_H - 1)),
    cylinder(KNOB_H, KNOB_R, 32).translate(0, 0, LID_T),
  )
  .color('plate');

// ── Index servo — static, vertical under the plate ──────────────────────────
const servoIndex = mountServo(0, 0, -15);

// ── Params ───────────────────────────────────────────────────────────────────
const carriageDeg = param('carriageDeg', 0, {
  min: 0, max: 300, description: 'Carriage azimuth — 30+60k fills from chamber k, 0 is the drop station',
});
const scoopDeg = param('scoopDeg', 0, {
  min: 0, max: 180, description: 'Scoop roll — 0 mouth up (fill/carry), 180 drops the dose',
});

// ── Assembly — chained joints: body → carriage → scoop ──────────────────────
const asm = assembly('spice-dispenser-static-chambers');
const bodyPart = asm.part('body', body);
bodyPart.connector('carriageAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, CARR_Z0] }, axis: [0, 0, 1] });
bodyPart.connector('blockSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_Z0] } });
bodyPart.connector('idxMount', { type: 'frame', origin: { kind: 'vec3', value: [0, ROT_CCY, -15] } });

const carrPart = asm.part('carriage', carriage);
carrPart.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
carrPart.connector('scoopAxis', { type: 'axis', origin: { kind: 'vec3', value: [BOLT_R, 0, TUBE_Z] }, axis: [1, 0, 0] });
carrPart.connector('scoopServoMount', { type: 'frame', origin: { kind: 'vec3', value: [17, 0, TUBE_Z] } });

const blockPart = asm.part('block', block);
blockPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
blockPart.connector('lidSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_H] } });

const lidPart = asm.part('lid', lid);
lidPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

const doserPart = asm.part('scoop', doser);
doserPart.connector('rollAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });

const scoopServoPart = asm.part('servo-scoop', servoScoop);
scoopServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [17, 0, TUBE_Z] } });

const idxServoPart = asm.part('servo-index', servoIndex);
idxServoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, ROT_CCY, -15] } });

// Both rotors are enclosed by design — declared to Gate 4.
asm.mate('index', 'body.carriageAxis', 'carriage.axis', 'revolute', { pose: carriageDeg, limitsDeg: [0, 300], exposure: 'concealed' });
asm.mate('roll', 'carriage.scoopAxis', 'scoop.rollAxis', 'revolute', { pose: scoopDeg, limitsDeg: [0, 180], exposure: 'concealed' });
asm.mate('block-fit', 'body.blockSeat', 'block.seat', 'fastened');
asm.mate('lid-fit', 'block.lidSeat', 'lid.seat', 'fastened');
asm.mate('scoop-servo-fix', 'carriage.scoopServoMount', 'servo-scoop.mount', 'fastened');
asm.mate('idx-servo-fix', 'body.idxMount', 'servo-index.mount', 'fastened');

return asm.solvedModel({});
