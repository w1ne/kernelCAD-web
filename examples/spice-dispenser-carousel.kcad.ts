// Spice Dispenser — CAROUSEL IN A CAN (v7).
//
// Architecture decision (after the v6 selection-flaw finding: one open
// pocket cannot travel past other chambers): selection and metering are two
// independently sealed DOFs —
//   • SELECTION = the chamber DRUM rotating inside a STATIC clear shell.
//     Sealed by construction: every chamber rides on the solid floor except
//     at the single dispensing station, so "crossing" cannot contaminate.
//   • METERING = a small pocket-disc at that one station (the proven
//     disc-valve mechanism): pocket fills under the chamber outlet, swings
//     ~124°, drops through the floor chute. ~0.5 ml per cycle.
//
// User requirements baked in:
//   • SEE the spices: shell, drum and cap print in Formlabs Clear resin
//     (rendered as glass via .material transmission)
//   • NO fingers inside: refill through a single Ø14 funnel collar in the
//     static cap — index the drum to bring each chamber under it
//   • motors: Feetech STS3215 (vendor STEP) central for the drum; MG90S for
//     the metering disc; both static under the plate, zero moving cables
//   • Formlabs SLA fits: 0.25 mm running faces, 0.3 mm sliding bores
//
// Choreography: drumDeg = k·60° parks chamber k at the station (azimuth 0°)
// — same azimuth as the cap's fill collar, so the parked chamber is also
// the refillable one. meterDeg: 0° fills the pocket, 130° drops the dose.

// ── Dimensions (mm) ────────────────────────────────────────────────────────
const SHELL_R = 42;            // Ø84 — buys full Ø18 chambers inside a static shell
const WALL_T  = 3;
const PLATE_T = 14;            // floor plate: meter disc seat + both servo mounts
const DRUM_R  = 38;            // 1.0 mm to the shell bore
const DRUM_H  = 55;
const BOLT_R  = 26;            // chambers on a Ø52 bolt circle
const CHAM_R  = 9;             // Ø18 chambers
const OUT_R   = 22;            // chamber outlets offset INWARD (Ø10 at r22) — keeps the
                               // outer plate band r>28 free for the drop chute
const DRUM_Z0 = PLATE_T + 0.25;

// Metering geometry (worked out against the STS3215 footprint):
const MC_X = 24.2, MC_Y = -7.7;   // meter-disc axis — |C|=25.4, clear of the central servo
const METER_ORBIT = 8.1;          // pocket orbit; fill lands exactly on (22, 0)
const DISC_R = 13.1, DISC_T = 8;
const DUMP_X = 31.9, DUMP_Y = -10.2;  // pocket at meterDeg≈124° — chute fully outside the
                                       // chamber-outlet annulus (r<27), inside the bore

// ── MG90S (metering servo), modeled to datasheet ────────────────────────────
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
  const spline = cylinder(4, 2.45, 16).translate(MG_SHAFT_X, 0, MG_H + 2)
    .subtract(cylinder(3, 1, 12).translate(MG_SHAFT_X, 0, MG_H + 3)).color('shaft');
  const cable  = cylinder(5, 1.6, 12).alongAxis([1, 0, 0]).translate(MG_L / 2, 0, 5).color('#222222');
  return caseBody.union(flange, boss, spline, cable);
}
function mountServo(x, y, dz) {
  return mg90s().rotate([0, 0, 1], 90).translate(x, y - MG_SHAFT_X, dz === undefined ? -18.5 : dz);
}

// ── Shell — floor plate + clear wall, the static grip body ──────────────────
const plate = cylinder(PLATE_T, SHELL_R, 96);
const wall  = cylinder(DRUM_H + 1, SHELL_R, 96).translate(0, 0, PLATE_T)
  .subtract(cylinder(DRUM_H + 3, SHELL_R - WALL_T, 96).translate(0, 0, PLATE_T - 1));
// Meter-disc seat: pocket in the plate top; disc top runs flush with the
// plate top, 0.25 under the drum floor.
const discSeat   = cylinder(8.45, DISC_R + 0.3, 96).translate(MC_X, MC_Y, PLATE_T - 8.25);
const meterWell  = cylinder(4.4, 3.5, 32).translate(MC_X, MC_Y, 2.4);          // MG90S boss/spline passage
const dropChute  = cylinder(PLATE_T + 2, 5, 32).translate(DUMP_X, DUMP_Y, -1); // Ø10, outside the outlet annulus
const drumGallery = cylinder(PLATE_T + 2, 6.5, 48).translate(0, 0, 3.8);       // drum hub passage (output flange lives in the seat below)
// STS3215 seat (length along Y), and the MG90S recess + screw passages.
const stsSeat   = box(28.5, 60, 8.7, true).translate(0, 0, -0.45);
const mgRecess  = box(16, 27, 3.4).translate(MC_X - 8, MC_Y + 5.4 - 13.5, 0);
const mgScrewA  = cylinder(6, 1.1, 16).translate(MC_X, MC_Y + 5.4 + 14, -1);
const mgScrewB  = cylinder(6, 1.1, 16).translate(MC_X, MC_Y + 5.4 - 14, -1);
const shell = plate
  .union(wall)
  .subtract(discSeat, meterWell, dropChute, drumGallery, stsSeat, mgRecess, mgScrewA, mgScrewB)
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.06, transmission: 0.85, ior: 1.5, thickness: 2.5 });

// ── Drum — the rotating carousel (clear, so spice levels show through) ──────
// Local frame: origin on the axis at the drum bottom (world z=14.25).
const chamberL  = cylinder(52, CHAM_R, 32).translate(BOLT_R, 0, 4);
const chambersL = chamberL.patternCircular({ count: 6, axis: [0, 0, 1] });
const outletL   = cylinder(6, 5, 32).translate(OUT_R, 0, -1);                  // Ø10, inward-offset
const outletsL  = outletL.patternCircular({ count: 6, axis: [0, 0, 1] });
const drumHub   = cylinder(13.3, 6, 32).translate(0, 0, -11.3);                // down to the STS output
const hubSocket = cylinder(4.55, 3.3, 16).translate(0, 0, -11.35);             // output coupling (0.3 SLA fit)
const drum = cylinder(DRUM_H, DRUM_R, 96)
  .union(drumHub)
  .subtract(chambersL, outletsL, hubSocket)
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.08, transmission: 0.8, ior: 1.5, thickness: 2 });

// ── Meter disc — the pocket rotor at the station ─────────────────────────────
// Local frame: origin on its axis at the disc bottom (world z=6). The Ø9
// pocket sits at the FILL bearing (local (-2.2, 7.7) → world (22, 0)); the
// connector axis is [0,0,-1] so increasing meterDeg sweeps it clockwise to
// the chute at (31.9, -10.2).
const meterPocket = cylinder(10, 4.5, 32).translate(-2.2, 7.7, -1);
const meterSocket = cylinder(3.2, 2.6, 16).translate(0, 0, -0.05);
const meterDisc = cylinder(DISC_T, DISC_R, 96)
  .subtract(meterPocket, meterSocket)
  .color('gear');

// ── Cap — static top with the finger-safe fill collar ───────────────────────
// Local frame: seat on the wall top (world z=70). Ø14 port through a raised
// funnel collar at azimuth 0° — pour in, fingers stay out; the drum indexes
// each chamber under it for refilling.
const capPort = cylinder(16, 7, 32).translate(BOLT_R, 0, -5);
const cap = cylinder(5, SHELL_R + 2, 96)
  .union(
    cylinder(6, SHELL_R + 2, 96).translate(0, 0, -6)                           // outer skirt over the wall (0.3 fit)
      .subtract(cylinder(8, SHELL_R + 0.3, 96).translate(0, 0, -7)),
    cylinder(7, 10, 32).translate(BOLT_R, 0, 5),                               // funnel collar
  )
  .subtract(capPort)
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.06, transmission: 0.85, ior: 1.5, thickness: 2.5 });

// ── Servos ───────────────────────────────────────────────────────────────────
// Drum drive: Feetech STS3215, vendor STEP (SO-ARM100 bundle, Apache-2.0),
// length along Y, output up through the seat into the drum hub.
const servoDrum = (await lib.fromSTEP('./robot-arm/so100/parts/STS3215.step'))
  .rotate([0, 0, 1], 90)
  .translate(0, 0, -16.5)
  .color('servo');
// Meter drive: MG90S vertical at the disc axis, classic under-plate mounting.
const servoMeter = mountServo(MC_X, MC_Y, -19.5);

// ── Params ───────────────────────────────────────────────────────────────────
const drumDeg = param('drumDeg', 0, {
  min: 0, max: 360, description: 'Carousel — k·60° parks chamber k at the station/fill collar',
});
const meterDeg = param('meterDeg', 0, {
  min: 0, max: 130, description: 'Meter disc — 0 fills the pocket, 130 drops the dose',
});

// ── Assembly ─────────────────────────────────────────────────────────────────
const asm = assembly('spice-dispenser-carousel');
const shellPart = asm.part('shell', shell);
shellPart.connector('drumAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, DRUM_Z0] }, axis: [0, 0, 1] });
shellPart.connector('meterAxis', { type: 'axis', origin: { kind: 'vec3', value: [MC_X, MC_Y, 6] }, axis: [0, 0, -1] });
shellPart.connector('capSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, PLATE_T + DRUM_H + 1] } });
shellPart.connector('stsMount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -16.5] } });
shellPart.connector('mgMount', { type: 'frame', origin: { kind: 'vec3', value: [MC_X, MC_Y + 5.4, -19.5] } });

const drumPart = asm.part('drum', drum);
drumPart.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

const meterPart = asm.part('meter-disc', meterDisc);
meterPart.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, -1] });

const capPart = asm.part('cap', cap);
capPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

const stsPart = asm.part('servo-drum', servoDrum);
stsPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -16.5] } });

const mgPart = asm.part('servo-meter', servoMeter);
mgPart.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [MC_X, MC_Y + 5.4, -19.5] } });

// Both rotors are enclosed by design — declared to Gate 4.
asm.mate('index', 'shell.drumAxis', 'drum.axis', 'revolute', { pose: drumDeg, limitsDeg: [0, 360], exposure: 'concealed' });
asm.mate('meter', 'shell.meterAxis', 'meter-disc.axis', 'revolute', { pose: meterDeg, limitsDeg: [0, 130], exposure: 'concealed' });
asm.mate('cap-fit', 'shell.capSeat', 'cap.seat', 'fastened');
asm.mate('sts-fix', 'shell.stsMount', 'servo-drum.mount', 'fastened');
asm.mate('mg-fix', 'shell.mgMount', 'servo-meter.mount', 'fastened');

return asm.solvedModel({});
