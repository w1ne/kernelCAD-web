// Spice Dispenser — STATIC CHAMBERS + TRAVELING SCOOP POCKET (v6).
//
// v5's carriage (tube + riding micro-servo) had two real mechanical flaws:
// the scoop hung in AIR below the chamber outlets (spillage past the tube =
// residue all over the bay) and its servo's cable rode the rotor (tangle).
// v6 merges the scoop INTO the seal disc — the scoop is a pocket that
// travels:
//   • a thick (8 mm) disc runs face-to-face between the chamber block and
//     the floor — 0.15 mm running clearance on BOTH faces, so the spice
//     column always rides on a sealed surface: no air gaps, no spillage
//   • the 9×15 mm capsule pocket through the disc IS the scoop (~0.9 ml):
//     under chamber k it fills (floor seals the bottom); travelling, both
//     faces seal it; over the outlet at station 0° the floor opens and the
//     dose drops. You can always NOT dispense — park anywhere else.
//   • ONE motor, static, central: a Feetech STS3215 bus servo (19.5 kg·cm —
//     ample for the face friction; vendor STEP, Apache-2.0, bundled from
//     TheRobotStudio/SO-ARM100). No cable ever moves; the rotor is passive
//     and can spin continuously.
//
// Choreography (single param `discDeg`): chambers at 30°+k·60°, outlet at
// 0°. Dose chamber k: 30+60k (fill) → 0 (drop); repeat for more doses.
//
// Geometry blockout — the disc hub's socket onto the STS3215 output is
// simplified (real build: 25T spline horn screwed to the hub).

// ── Dimensions (mm) ────────────────────────────────────────────────────────
const SHELL_R   = 38;          // Ø76 outer silhouette
const BOLT_R    = 24;          // chambers (and the pocket orbit) on a Ø48 bolt circle
const CHAMBER_R = 9;           // Ø18 spice chambers

const PLATE_T   = 12;          // floor plate: outlet chute + servo seat live here
const DISC_T    = 8;           // scoop-pocket depth = the dose height
const DISC_Z0   = PLATE_T + 0.15;        // disc bottom — 0.15 running clearance on the floor
const BLOCK_Z0  = DISC_Z0 + DISC_T + 0.15;  // 20.3 — chamber block seat
const BLOCK_H   = 55;

const LID_T       = 5;
const LID_SKIRT_H = 8;
const KNOB_R      = 7;
const KNOB_H      = 12;

// ── Body — floor plate + bay ring, one static printed part ──────────────────
// The plate top IS the valve floor the disc rides on: one Ø12 outlet chute
// at station 0° and the central gallery for the disc hub. The STS3215 seats
// in a shallow recess in the underside, body hanging below (long side along
// Y so it clears the outlet chute).
const plate = cylinder(PLATE_T, SHELL_R, 96);
const ring  = cylinder(BLOCK_Z0 - PLATE_T, SHELL_R, 96).translate(0, 0, PLATE_T)
  .subtract(cylinder(BLOCK_Z0 - PLATE_T + 2, 32.5, 96).translate(0, 0, PLATE_T - 1));
const outletChute = cylinder(PLATE_T + 2, 6, 32).translate(12, 20.78, -1);     // Ø12 drop hole, station 60° (clears the un-rotated servo body)
const gallery     = cylinder(PLATE_T + 2, 7, 48).translate(0, 0, -1);          // Ø14 for the disc hub
const servoSeat   = box(47, 27, 2.7).translate(-23.5, -13.5, 0);               // shallow recess; body hangs below
const body = plate
  .union(ring)
  .subtract(outletChute, gallery, servoSeat)
  .color('frame');

// ── Scoop disc — the ONE rotor: seal disc with the traveling pocket ─────────
// Local frame: origin on the axis at the disc bottom (world z=12.15).
const pocket = box(9, 5, DISC_T + 2).translate(BOLT_R - 4.5, -2.5, -1)
  .union(
    cylinder(DISC_T + 2, 4.5, 32).translate(BOLT_R, -2.5, -1),
    cylinder(DISC_T + 2, 4.5, 32).translate(BOLT_R, 2.5, -1),
  );
const hub = cylinder(9.2, 6, 32).translate(0, 0, -9.2)                          // down the gallery to the servo output
  .subtract(cylinder(4.5, 3.15, 16).translate(0, 0, -9.25));                    // output-spline socket (simplified)
const disc = cylinder(DISC_T, 32, 96)
  .union(hub)
  .subtract(pocket)
  .color('gear');

// ── Chamber block — the static grip body ────────────────────────────────────
// Local frame: seat on the ring top (world z=20.3). Chambers at 30°+k·60°
// (station 0° is the drop station, never under a chamber); Ø12 outlets ride
// directly on the disc face.
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

// ── Servo — Feetech STS3215, vendor STEP (SO-ARM100 bundle, Apache-2.0) ─────
// Local bbox ≈ 45×25×40 centred on its origin, output shaft +Z on the axis.
// Long side turned along Y to clear the outlet chute; top seats 2.4 mm into
// the underside recess, output reaching the disc hub through the gallery.
const servo = (await lib.fromSTEP('./robot-arm/so100/parts/STS3215.step'))
  .translate(0, 0, -17.5)
  .color('servo');

// ── Param ────────────────────────────────────────────────────────────────────
const discDeg = param('discDeg', 0, {
  min: 0, max: 360, description: 'Scoop-pocket azimuth — 30+60k fills from chamber k, 60 drops the dose',
});

// ── Assembly ─────────────────────────────────────────────────────────────────
const asm = assembly('spice-dispenser-static-chambers');
const bodyPart = asm.part('body', body);
bodyPart.connector('discAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, DISC_Z0] }, axis: [0, 0, 1] });
bodyPart.connector('blockSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_Z0] } });
bodyPart.connector('servoSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -17.5] } });

const blockPart = asm.part('block', block);
blockPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
blockPart.connector('lidSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, BLOCK_H] } });

const lidPart = asm.part('lid', lid);
lidPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

const discPart = asm.part('scoop-disc', disc);
discPart.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

const servoPart = asm.part('servo', servo);
servoPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -17.5] } });

// The disc runs enclosed between block and floor — declared to Gate 4.
asm.mate('index', 'body.discAxis', 'scoop-disc.axis', 'revolute', { pose: discDeg, limitsDeg: [0, 360], exposure: 'concealed' });
asm.mate('block-fit', 'body.blockSeat', 'block.seat', 'fastened');
asm.mate('lid-fit', 'block.lidSeat', 'lid.seat', 'fastened');
asm.mate('servo-fix', 'body.servoSeat', 'servo.mount', 'fastened');

return asm.solvedModel({});
