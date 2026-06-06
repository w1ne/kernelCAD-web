// Spice Dispenser — CAROUSEL IN A CAN (v7.3: screwed assembly, slick body).
//
// Architecture: selection and metering are two independently sealed DOFs —
// the chamber DRUM rotates inside a static clear shell (STS3215, central);
// a pocket DISC meters at the single station (MG90S): fills under the
// parked chamber's outlet, swings ~117°, drops the ~0.5 ml dose.
//
// v7.3 (user direction):
//   • SLICK: no external downpipe, no internal free-fall. The dose slides
//     one continuous enclosed 40° channel: pocket → through the plate →
//     through a solid block bridging into the skirt wall → out a spout
//     MOUTH on the side of the base band (z -3.5..-11). Aimable like a
//     coin chute; the electronics bay never sees spice. Nothing breaks the
//     silhouette: Ø88 base / Ø84 clear window / Ø88 cap.
//   • SERVO MOUNTING: STS3215 screws through its 4 ear holes into M2
//     pilots over the seat (az ±5, ±20 in the rotated frame); MG90S flange
//     screws into M2 pilots at ±14 — both drive up from inside the bay.
//   • SCREWED ASSEMBLY (M2 + heat-set inserts):
//       wall→base: 4× M2×16 up through the base rim (counterbored heads)
//                  into inserts in the wall's bottom flange, az 45+k·90
//       skirt→base: 3× M2×6 up through the skirt's top flange into inserts
//                  in the base underside, az 60+k·120
//       cover→skirt: 3× M2×6 up into inserts in skirt wall bosses,
//                  az 60+k·120 (deeper, r37.5)
//   • DRUM MOUNT: the STS3215's stock METAL HORN DISC (Ø20) is the drive
//     coupling — horn screws to the servo output, the drum's Ø20 hub face
//     sits flat on it with 4× M2 into drum inserts on a Ø13.2 circle. One
//     constant Ø7 bore runs the drum's full height: the cap spigot bears in
//     it from above, the horn's center screw is driven through it from the
//     top. No printed-spline torque transfer, no stepped holes.
//   • ASSEMBLY ORDER: servos screw into base seats → horn screws to drum
//     hub (4× M2, drum in hand) → drum+horn lowered onto servo output,
//     center screw driven down the drum channel → meter disc dropped onto
//     the MG spline → wall screwed onto base (4× from below) → cap pressed
//     on (spigot enters drum bore) → electronics onto cover → skirt screwed
//     under base → cover screwed under skirt.
//
// ERGONOMICS:
//   • BULK FILL: cap off — all six chambers open, each with a Ø22 pour
//     mouth. Collar port for top-ups (drumDeg = k·60 + 180).
//   • CLEANING: cap off → drum lifts off the horn (4 screws) or stays —
//     chambers rinse in place; disc lifts out of its seat tool-free.
//   • HANDLING: Ø88×110 mug format, bottom-heavy (motors + battery low).
//     Cap skirt overhang = thumb ledge. Dispense side marked by the collar
//     sitting opposite (collar at 180°, drop at ~-19°).
//
// Carried v7.1/7.2 fixes: angled chute (off the servo), collar at 180°
// (no pocket packing on refill), pocket vent groove (vacuum lock), cap
// spigot drum bearing, labyrinth/annular dust paths, 0.35 cap gap, cored
// drum (Ø20 chambers, bottom-open lightening ring), electronics bay
// (LiPo + compact ESP32 — bus servo + 1 PWM pin, no driver board).
//
// Trade-offs documented: meter DOF keeps the MG90S (two STS3215 don't pack
// under Ø84; STS torque telemetry + retry choreography mitigate); Formlabs
// Clear prints frosted (polish outside), standard resins NOT food-contact
// certified — coat or re-material the spice path for a real build.
// Electronics are labeled blockouts.
//
// BUILD RULE — Formlabs SLA: running fits ≥0.25 mm/face, sliding bores
// ≥0.3 mm radial, walls ≥1.5 mm, heat-set inserts over resin threads.

// ── Dimensions (mm) ────────────────────────────────────────────────────────
const BASE_R  = 44;            // Ø88 base plate / skirt / cap
const WALL_R  = 42;            // Ø84 clear window section
const WALL_T  = 3;
const PLATE_T = 14;
const DRUM_R  = 38;
const DRUM_H  = 55;
const BOLT_R  = 26;            // chambers on a Ø52 bolt circle
const CHAM_R  = 10;            // Ø20 chambers, ~16 ml each
const OUT_R   = 22;            // chamber outlets offset INWARD (Ø10 at r22)
const DRUM_Z0 = PLATE_T + 0.25;
const SKIRT_D = 40;

// Metering station:
const MC_X = 23.0, MC_Y = -8.1;
const DISC_R = 14.1, DISC_T = 8;
const PKT_X = -1.0, PKT_Y = 8.1;
const DUMP_X = 30.6, DUMP_Y = -10.8;
const CH_X = 31.1, CH_Y = -11.0;   // drop-channel axis — Ø11 bore sits just outside the outlet annulus

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

// ── BASE — the middle plate: every working surface lives here ────────────────
const plateBlank  = cylinder(PLATE_T, BASE_R, 96);
const discSeat    = cylinder(8.45, DISC_R + 0.3, 96).translate(MC_X, MC_Y, PLATE_T - 8.25);
const meterWell   = cylinder(4.4, 3.5, 32).translate(MC_X, MC_Y, 2.4);
const discCbore   = cylinder(1.15, 5.45, 32).translate(MC_X, MC_Y, 4.65);
const drumGallery = cylinder(PLATE_T + 2, 10.4, 64).translate(0, 0, 3.8);      // passes horn (Ø20) + drum hub; 0.4 annular dust gap
// One Ø11 channel, monotonically widening: Ø9 pocket → Ø11 throat → Ø11
// raked bore → Ø11 side mouth. No steps against the flow, no size change.
const chuteStub   = cylinder(3.5, 5.5, 32).translate(CH_X, CH_Y, 4.4);
const chuteAngled = cylinder(20, 5.5, 32).alongAxis([0.606, -0.214, -0.766]).translate(CH_X, CH_Y, 6.3);
const stsEarScrews = cylinder(7, 0.85, 12).translate(5, 7.7, 3)                // 4x M2 pilots over the STS3215 mounting ears
  .union(cylinder(7, 0.85, 12).translate(-5, 7.7, 3),
         cylinder(7, 0.85, 12).translate(5, -32.7, 3),
         cylinder(7, 0.85, 12).translate(-5, -32.7, 3));
// STS3215's output is OFFSET 12.5 mm from its body center (measured from
// the vendor STEP) — the body hangs toward -y so the output spline lands
// exactly on the drum axis.
const stsSeat   = box(28.5, 47.5, 8.7, true).translate(0, -12.5, -0.45);
const mgRecess  = box(16, 27, 3.4).translate(MC_X - 8, MC_Y + 5.4 - 13.5, 0);
const mgScrewA  = cylinder(6, 0.85, 12).translate(MC_X, MC_Y + 5.4 + 14, -1); // M2 pilots — MG90S flange screws bite here
const mgScrewB  = cylinder(6, 0.85, 12).translate(MC_X, MC_Y + 5.4 - 14, -1);
// Fastening pattern (see header): wall screws az 45+k·90, skirt inserts az 60+k·120.
const wallBore  = cylinder(16, 1.1, 16).translate(41.5 * 0.7071, 41.5 * 0.7071, -1)
  .union(cylinder(4, 2.25, 16).translate(41.5 * 0.7071, 41.5 * 0.7071, -1))    // head counterbore
  .patternCircular({ count: 4, axis: [0, 0, 1] });
const skirtInsert = cylinder(6, 1.6, 16).translate(41 * 0.5, 41 * 0.866, -1)
  .patternCircular({ count: 3, axis: [0, 0, 1] });
const base = plateBlank
  .subtract(discSeat, meterWell, discCbore, drumGallery, chuteStub, chuteAngled,
            stsSeat, stsEarScrews, mgRecess, mgScrewA, mgScrewB, wallBore, skirtInsert)
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.2, transmission: 0.3, ior: 1.5, thickness: 3 });

// ── WALL — the clear window can, flanged foot, screwed to the base ───────────
// Local frame: origin at its bottom face (world z=14).
const wallBoss = cylinder(6, 2.5, 24).translate(41.5 * 0.7071, 41.5 * 0.7071, 3.5)
  .patternCircular({ count: 4, axis: [0, 0, 1] });                             // load-spreading boss columns over each insert
const wallInserts = cylinder(6.5, 1.6, 16).translate(41.5 * 0.7071, 41.5 * 0.7071, -0.05)
  .patternCircular({ count: 4, axis: [0, 0, 1] });
const wall = cylinder(DRUM_H + 0.6, WALL_R, 96)
  .union(cylinder(4, BASE_R, 96), wallBoss)                                    // flanged foot + bosses host the inserts
  .subtract(cylinder(DRUM_H + 2.6, WALL_R - WALL_T, 96).translate(0, 0, -1), wallInserts)
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.06, transmission: 0.85, ior: 1.5, thickness: 2.5 });

// ── SKIRT — electronics bay + internal spice corridor, screwed under base ────
// Local frame: world (origin at the base underside plane z=0).
const skirtBody = cylinder(SKIRT_D, BASE_R, 96).translate(0, 0, -SKIRT_D)
  .subtract(cylinder(SKIRT_D + 2, 39.5, 96).translate(0, 0, -SKIRT_D - 1));
const skirtFlange = cylinder(3, BASE_R, 96).translate(0, 0, -3)
  .subtract(cylinder(5, 36, 96).translate(0, 0, -4));
// Spice spout: the chute keeps raking 40° through a solid block bridging
// plate and skirt wall, and breaks out the SIDE of the base band — a fully
// enclosed channel, mouth at z -3.5..-11. Nothing falls through the bay.
const spoutBlock = box(11, 11, 10.5, true).rotate([0, 0, 1], -19.5).translate(36, -12.75, -5.25)
  .subtract(box(4.5, 5, 11.5, true).translate(29.0, -14.4, -5.2));             // corner relief for the MG90S case
const chuteAngledS = cylinder(20, 5.5, 32).alongAxis([0.606, -0.214, -0.766]).translate(CH_X, CH_Y, 6.3);
const coverBoss = cylinder(7, 3.5, 24).translate(37.5 * 0.5, 37.5 * 0.866, -37)
  .patternCircular({ count: 3, axis: [0, 0, 1] });                             // roots merge into the skirt wall
const skirtScrewHole = cylinder(5, 1.1, 16).translate(41 * 0.5, 41 * 0.866, -4)
  .union(cylinder(1.6, 2.25, 16).translate(41 * 0.5, 41 * 0.866, -3.05))       // head recess
  .patternCircular({ count: 3, axis: [0, 0, 1] });
const coverInsert = cylinder(5, 1.6, 16).translate(37.5 * 0.5, 37.5 * 0.866, -37.1)
  .patternCircular({ count: 3, axis: [0, 0, 1] });
const cableNotch = box(14, 8, 14, true).translate(0, -41.5, -33);
const skirt = skirtBody
  .union(skirtFlange, spoutBlock, coverBoss)
  .subtract(chuteAngledS, skirtScrewHole, coverInsert, cableNotch,
            box(27, 7, 6, true).translate(0, -35.5, -2))                       // flange relief over the STS3215 far end
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.2, transmission: 0.3, ior: 1.5, thickness: 3 });

// ── DRUM — cored carousel on the metal horn ──────────────────────────────────
// Local frame: origin on the axis at the drum bottom (world z=14.25).
const chamberL  = cylinder(52, CHAM_R, 32).translate(BOLT_R, 0, 4);
const chambersL = chamberL.patternCircular({ count: 6, axis: [0, 0, 1] });
const outletL   = cylinder(6, 5, 32).translate(OUT_R, 0, -1);
const outletsL  = outletL.patternCircular({ count: 6, axis: [0, 0, 1] });
const drumHub   = cylinder(8.1, 10, 48).translate(0, 0, -8.05);                // flat face onto the metal horn (world z=6.2)
const hornInserts = cylinder(9, 1.6, 16).translate(6.6, 0, -8.15)              // 4x M2 heat-sets on the horn's Ø13.2 circle
  .patternCircular({ count: 4, axis: [0, 0, 1] });
const centralBore = cylinder(66, 3.5, 32).translate(0, 0, -8);                 // ONE Ø7 bore, top to horn: spigot bearing above, driver channel below
const lightenRing  = cylinder(52, 14.5, 64).translate(0, 0, -1)
  .subtract(cylinder(54, 10.5, 48).translate(0, 0, -2));
const mouthL  = cylinder(4, 11, 32).translate(25, 0, 52.5);
const mouthsL = mouthL.patternCircular({ count: 6, axis: [0, 0, 1] });
// Chamber numbers: digits 1..6 engraved 0.8 mm into the drum top face's
// inner annulus (r ≈ 9.5, between the Ø7 central bore and the pour-mouth
// ring), each radially aligned with its chamber and reading outward (frosted
// digits on Formlabs Clear). Chamber N parks at the station when
// drumDeg = (N−1)·60 — the engraved number IS the firmware chamber index, so
// "spice → number" maps once at fill time (cap off) and holds for dispense
// commands. Implementation detours around two kernel gaps (2026-06-06):
// embossText cuts silently no-op on cylinder end-caps, and its glyphs come
// out MIRRORED — so each digit is embossed RAISED on a sacrificial box
// plate (the tested path), the plate subtracted away to extract the glyph
// prism, the prism un-mirrored with reflect('yz'), then used as a cutter.
// The digit zone clears every other top cut (mouths start at r14).
const NUM_R = 9.5, NUM_SIZE = 6, NUM_CUT = 0.8;
const digitCutter = (k) => {
  const glyph = box(12, 12, 2, true)                                           // plate top face at z = +1
    .embossText({
      textContent: String(k + 1),
      face: 'top',
      size: NUM_SIZE,
      depth: 2 * NUM_CUT,                                                      // prism z = 1 .. 1 + 1.6
      align: 'center',
      anchorU: 0.5,
      anchorV: 0.5,
    })
    .subtract(box(12, 12, 2, true))                                            // keep only the glyph prism
    .reflect('yz');                                                            // un-mirror the glyph
  const az = (k * 60 * Math.PI) / 180;
  return glyph
    .rotate([0, 0, 1], k * 60 - 90)                                            // glyph "up" points radially outward
    .translate(NUM_R * Math.cos(az), NUM_R * Math.sin(az), DRUM_H - 1 - NUM_CUT);
};
const numberCutters = digitCutter(0)
  .union(digitCutter(1), digitCutter(2), digitCutter(3), digitCutter(4), digitCutter(5));
const drum = cylinder(DRUM_H, DRUM_R, 96)
  .union(drumHub)
  .subtract(chambersL, outletsL, hornInserts, centralBore, lightenRing, mouthsL, numberCutters)
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.08, transmission: 0.8, ior: 1.5, thickness: 2 });

// ── METER DISC ───────────────────────────────────────────────────────────────
const meterPocket = cylinder(10, 4.5, 32).translate(PKT_X, PKT_Y, -1);
const meterSocket = cylinder(4.35, 2.6, 16).translate(0, 0, -1.15);
const bossRelief  = cylinder(0.85, 3.4, 16).translate(0, 0, -1.15);
const ventGroove  = box(1.5, 6.5, 1.4).translate(-0.75, 8.1, 6.7).rotate([0, 0, 1], 7);
const discFlange  = cylinder(0.75, 5, 32).translate(0, 0, -1.05);
const meterDisc = cylinder(DISC_T, DISC_R, 96)
  .union(discFlange)
  .subtract(meterPocket, meterSocket, bossRelief, ventGroove)
  .color('gear');

// ── CAP — fill collar at 180°, drum spigot bearing, press-fit ────────────────
// Local frame: seat on the wall top (world z=69.6).
const capPort = cylinder(16, 7, 32).translate(-BOLT_R, 0, -5);
const cap = cylinder(5, BASE_R, 96)
  .union(
    cylinder(6, BASE_R, 96).translate(0, 0, -6)
      .subtract(cylinder(8, WALL_R + 0.3, 96).translate(0, 0, -7)),
    cylinder(7, 10, 32).translate(-BOLT_R, 0, 5),
    cylinder(6.5, 3.2, 32).translate(0, 0, -6.5),
  )
  .subtract(capPort)
  .material({ baseColor: '#ffffff', metalness: 0, roughness: 0.06, transmission: 0.85, ior: 1.5, thickness: 2.5 });

// ── Electronics bay: cover + blockout components (cover-local frames) ────────
const coverHoles = cylinder(5, 1.1, 16).translate(37.5 * 0.5, 37.5 * 0.866, -1)
  .patternCircular({ count: 3, axis: [0, 0, 1] });
const cover = cylinder(3, 39.2, 96)
  .subtract(coverHoles)
  .color('plate');
const battery = box(10, 50, 34, true).translate(-20, 0, 20).color('#3b6ea5');  // 103450 LiPo in a printed cradle
const esp32   = box(18, 23, 7, true).translate(22.5, 5.5, 6.5).color('#1f7a3d'); // compact ESP32 module

// ── Servos ───────────────────────────────────────────────────────────────────
// STS3215 vendor STEP + its stock Ø20 metal horn disc on the output.
const servoDrum = (await lib.fromSTEP('./robot-arm/so100/parts/STS3215.step'))
  .rotate([0, 0, 1], 90)
  .translate(0, -12.5, -16.5)                                                  // output spline (local +12.5,0) onto the drum axis
  .union(cylinder(3.0, 10, 48).translate(0, 0, 3.2).color('shaft'))             // stock metal horn disc — thin, sits right on the output
  .color('servo');
const servoMeter = mountServo(MC_X, MC_Y, -19.5);

// ── Params ───────────────────────────────────────────────────────────────────
const drumDeg = param('drumDeg', 0, {
  min: 0, max: 360, description: 'Carousel — (N−1)·60° parks engraved chamber N at the station; +180 parks it under the fill collar',
});
const meterDeg = param('meterDeg', 0, {
  min: 0, max: 130, description: 'Meter disc — 0 fills the pocket, ~117 drops the dose down the chute',
});

// ── Assembly ─────────────────────────────────────────────────────────────────
const asm = assembly('spice-dispenser-carousel');
const basePart = asm.part('base', base);
basePart.connector('drumAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, DRUM_Z0] }, axis: [0, 0, 1] });
basePart.connector('meterAxis', { type: 'axis', origin: { kind: 'vec3', value: [MC_X, MC_Y, 6] }, axis: [0, 0, -1] });
basePart.connector('wallSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, PLATE_T] } });
basePart.connector('skirtSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
basePart.connector('stsMount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -16.5] } });
basePart.connector('mgMount', { type: 'frame', origin: { kind: 'vec3', value: [MC_X, MC_Y + 5.4, -19.5] } });

const wallPart = asm.part('wall', wall);
wallPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
wallPart.connector('capSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, DRUM_H + 0.6] } });

const skirtPart = asm.part('skirt', skirt);
skirtPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
skirtPart.connector('coverSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -SKIRT_D] } });

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

const coverPart = asm.part('cover', cover);
coverPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
coverPart.connector('batterySeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });
coverPart.connector('espSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });

const batteryPart = asm.part('battery', battery);
batteryPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });

const espPart = asm.part('esp32', esp32);
espPart.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 3] } });

asm.mate('index', 'base.drumAxis', 'drum.axis', 'revolute', { pose: drumDeg, limitsDeg: [0, 360], exposure: 'concealed' });
asm.mate('meter', 'base.meterAxis', 'meter-disc.axis', 'revolute', { pose: meterDeg, limitsDeg: [0, 130], exposure: 'concealed' });
asm.mate('wall-fix', 'base.wallSeat', 'wall.seat', 'fastened');
asm.mate('skirt-fix', 'base.skirtSeat', 'skirt.seat', 'fastened');
asm.mate('cap-fit', 'wall.capSeat', 'cap.seat', 'fastened');
asm.mate('sts-fix', 'base.stsMount', 'servo-drum.mount', 'fastened');
asm.mate('mg-fix', 'base.mgMount', 'servo-meter.mount', 'fastened');
asm.mate('cover-fit', 'skirt.coverSeat', 'cover.seat', 'fastened');
asm.mate('battery-fit', 'cover.batterySeat', 'battery.seat', 'fastened');
asm.mate('esp-fit', 'cover.espSeat', 'esp32.seat', 'fastened');

return asm.solvedModel({});
