// K-Spray K-Lift — spray workcell on a certified boom lift (pitch concept).
// Z-up, millimetres. Proper kinematic build:
//   - every rigid body is ONE part (no interpenetrating subassemblies)
//   - the three boom/platform joints use the shared-pin hinge pattern:
//     parent = beam end + stub + pin hub; child = collar (clearance bore)
//     + cheek plates + flange. All clearances are rotation-invariant
//     (surfaces of revolution about the joint axis, or Y-band plates),
//     so the mechanism stays collision-free across every pose.
//   - the gun carriage rides the workcell rail on a prismatic mate; the
//     channel cheeks bear on the rail sides
//   - every part is mated: chain revolute, carriage prismatic, and each scene
//     part fastened to the part that carries it at a seat on their shared
//     face — no floating parts
//
// The lift is a generic Genie/Terex-class boom — a certified access machine.
// Komatachi builds only the workcell. Concept model, not a certified device.

// ---- pose parameters ------------------------------------------------------
const lowerDeg = param('lowerDeg', 70, {
  min: 68, max: 72,
  description: 'Lower-boom elevation relative to the base (deg).',
});
const upperRelDeg = param('upperRelDeg', -40, {
  min: -120, max: -40,
  description: 'Upper-boom angle relative to the lower boom (deg). -40 = working pose, -120 = folded low.',
});
const platformRelDeg = param('platformRelDeg', -30, {
  min: -60, max: 60,
  description: 'Platform counter-rotation relative to the upper boom (deg). Kept at -(lowerDeg+upperRelDeg) so the deck stays level.',
});
const carriageMm = param('carriageMm', 450, {
  min: 260, max: 760,
  description: 'Gun carriage travel along the platform rail (mm above rail base).',
});

// ---- application-sequence parameters (drive geometry directly) ------------
const extX = param('extX', 0, {
  min: 0, max: 1000,
  description: 'Robot-hand reach toward the facade (mm). 0 = stowed, ~950 = at the wall for tape work.',
});
const gripY = param('gripY', 664, {
  min: -700, max: 700,
  description: 'Robot-hand lateral position along the wall (mm); sweeps the tape strips.',
});
const maskProgress = param('maskProgress', 0, {
  min: 0, max: 1,
  description: 'Peelable mask-film coverage over the window (bottom-up, tracks the spray gun).',
});
const tapeTopP = param('tapeTopP', 0, {
  min: 0, max: 1,
  description: 'Top tape strip applied (left-to-right).',
});
const tapeBottomP = param('tapeBottomP', 0, {
  min: 0, max: 1,
  description: 'Bottom tape strip applied (right-to-left).',
});
const peelTopP = param('peelTopP', 0, {
  min: 0, max: 1,
  description: 'Top tape strip peeled (right-to-left).',
});
const peelBottomP = param('peelBottomP', 0, {
  min: 0, max: 1,
  description: 'Bottom tape strip peeled (left-to-right).',
});
const foamLowerP = param('foamLowerP', 0, {
  min: 0, max: 1,
  description: 'Foam band below the window; its top edge tracks the gun nozzle.',
});
const foamUpperP = param('foamUpperP', 0, {
  min: 0, max: 1,
  description: 'Foam strip above the window; appears as the gun exits over the masked zone.',
});

const C = {
  frame: '#27343d', dark: '#18232a', orange: '#f0782f', amber: '#f6b23b',
  gunBlue: '#1769aa', gunSilver: '#c5cdd1',
  ivory: '#e8e4d9', alu: '#aeb8bd', black: '#15191c', rubber: '#202326',
  red: '#d7222b', blue: '#315c72', glass: '#315c72',
  wall: '#e9e0d4', wallFace: '#f2ebdf', mask: '#eef7fb', ground: '#d8d4cc',
  windowFrame: '#ffffff', sill: '#e8e2d6', glassDeep: '#141f27', maskBlue: '#8fcbe8', reveal: '#4a4a45',
  foam: '#b98a2e', tape: '#d4a53c',
  fork: '#7d8290', pin: '#262a31',
} as const;
type Hex = `#${string}`;
type Dim = number | typeof extX;   // a size or centre that may follow a param

// ---- scene constants ------------------------------------------------------
const WALL_X = 3700;
const P0: [number, number, number] = [-800, 0, 1100];   // base <-> lower boom
const L1 = 2600;                                        // lower boom length
const L2 = 2200;                                        // upper boom length
const RAIL_X = 420;                                     // workcell rail x on the platform
const RAIL_BASE_Z = -125;                               // rail base (deck top) in platform frame
const RAIL_HALF_Y = 60;                                 // rail half-width; the carriage cheeks bear on it

// Shared hinge hardware. The pattern keeps 0.5 mm radial clearance between
// the pin hub and the collar bore (a running fit the mate check accepts as
// contact), and 5-25 mm Y-band clearance everywhere else.
const HUB_R = 99.5;        // parent pin hub radius (contains the pivot point)
const BORE_R = 100;        // child collar bore (joint clearance, declared to the mate)
const COLLAR_R = 140;      // child collar outer radius
const HUB_Y = 200;         // pin hub half-width (spans the cheek plates)
const COLLAR_Y = 160;      // child collar half-width
const BEAM_GAP = 150;      // beam ends stop this far short of the pivot

setCameraTarget(1100, 0, 2700);

// ---- shape helpers --------------------------------------------------------
function zCylinder(h: number, r: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).translate(x, y, z - h / 2).color(color);
}
function yCylinder(h: number, r: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).alongAxis([0, 1, 0]).translate(x, y - h / 2, z).color(color);
}
function xCylinder(h: number, r: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).alongAxis([1, 0, 0]).translate(x - h / 2, y, z).color(color);
}
function roundedBox(x: Dim, y: Dim, z: Dim, r: number, cx: Dim, cy: Dim, cz: Dim, color: Hex) {
  return box(x, y, z, true).translate(cx, cy, cz).color(color);
}
function frameConnector(origin: [number, number, number]) {
  return { type: 'frame' as const, origin: { kind: 'vec3' as const, value: origin } };
}
function axisConnector(origin: [number, number, number], axis: [number, number, number]) {
  return { type: 'axis' as const, origin: { kind: 'vec3' as const, value: origin }, axis };
}
// Child-side hinge hardware in the CHILD's part-local frame (origin = pivot,
// beam along +X): collar + cheek plates + flange, all unioned with the body.
function childHinge(body: ReturnType<typeof box>) {
  return body
    .union(yCylinder(COLLAR_Y * 2, COLLAR_R, 0, 0, 0, C.fork))
    .union(roundedBox(50, 120, 120, 10, 135, 0, 0, C.fork))   // neck: collar -> own body
    .subtract(yCylinder(COLLAR_Y * 2 + 60, BORE_R, 0, 0, 0, C.dark));   // drilled clearance bore
}

const lift = assembly('K-Spray K-Lift boom workcell concept');

// ===========================================================================
// PART: base — chassis, wheels, outriggers, turret + shoulder pin hardware.
// ===========================================================================
let baseGeom = roundedBox(3000, 1400, 420, 90, -100, 0, 470, C.frame)
  .union(roundedBox(2860, 1280, 60, 20, -100, 0, 690, C.alu))
  .union(roundedBox(600, 1200, 240, 40, 1050, 0, 590, C.dark))
  .union(roundedBox(720, 640, 240, 40, P0[0], 0, 835, C.frame))
  .union(roundedBox(420, 520, 280, 30, P0[0] - 470, 0, 840, C.blue))
  .union(zCylinder(120, 470, P0[0], 0, 740, C.dark))
  // Shoulder pin boss: a narrow neck rises through the collar bore to the
  // pin hub, so it can never touch the collar's solid ring.
  .union(roundedBox(120, 30, 175, 10, P0[0], 180, P0[2] - 72, C.dark))
  .union(roundedBox(120, 30, 175, 10, P0[0], -180, P0[2] - 72, C.dark))
  .union(yCylinder(HUB_Y * 2, HUB_R, P0[0], 0, P0[2], C.pin))
  .union(yCylinder(30, HUB_R + 12, P0[0], HUB_Y + 15, P0[2], C.fork))
  .union(yCylinder(30, HUB_R + 12, P0[0], -(HUB_Y + 15), P0[2], C.fork));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const wx = sx > 0 ? 950 : -1150;
  const wy = sy * 700;
  baseGeom = baseGeom
    .union(yCylinder(280, 300, wx, wy, 300, C.rubber))
    .union(yCylinder(300, 190, wx, wy, 300, C.dark))
    .union(yCylinder(310, 120, wx, wy, 300, C.alu))
    .union(yCylinder(316, 42, wx, wy, 300, C.orange));
  const ax = sx > 0 ? 1250 : -1450;
  const ay = sy * 560;
  const fx = sx > 0 ? 1580 : -1780;
  const fy = sy * 1080;
  const dz = 80 - 600;
  const dx = fx - ax, dy = fy - ay;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const legAxis: [number, number, number] = [dx / len, dy / len, dz / len];
  baseGeom = baseGeom
    .union(cylinder(len, 45, 24).alongAxis(legAxis).translate(ax, ay, 600).color(C.dark))
    .union(roundedBox(260, 260, 50, 10, fx, fy, 25, C.dark))
    .union(roundedBox(300, 300, 16, 4, fx, fy, 12, C.orange));
}
const base = lift.part('base', baseGeom);
// Ground seat: the underside of the front-left outrigger pad.
const BASE_SEAT: [number, number, number] = [1580, 1080, 0];
base.connector('groundFace', frameConnector(BASE_SEAT));
base.connector('lowerPivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: P0 },
  axis: [0, -1, 0],
  jointClearanceRadius: HUB_R,
});

// ===========================================================================
// PART: lower-boom — child collar at P0, beam, parent pin hardware at tip.
// ===========================================================================
let lowerGeom = childHinge(
  roundedBox(L1 - 2 * BEAM_GAP, 240, 160, 24, (L1) / 2, 0, 0, C.frame)
    .union(roundedBox(500, 200, 50, 12, 520, 0, 105, C.alu)),
);
lowerGeom = lowerGeom
  .union(roundedBox(60, 30, 200, 10, L1 - 90, 180, 0, C.alu))
  .union(roundedBox(60, 30, 200, 10, L1 - 90, -180, 0, C.alu))
  .union(roundedBox(80, 30, 40, 8, L1 - 160, 180, 100, C.dark))
  .union(roundedBox(80, 30, 40, 8, L1 - 160, -180, 100, C.dark))
  .union(roundedBox(80, 30, 40, 8, L1 - 160, 180, -100, C.dark))
  .union(roundedBox(80, 30, 40, 8, L1 - 160, -180, -100, C.dark))
  .union(roundedBox(55, 50, 240, 10, L1 - 172.5, 145, 0, C.dark))
  .union(roundedBox(55, 50, 240, 10, L1 - 172.5, -145, 0, C.dark))
  .union(yCylinder(HUB_Y * 2, HUB_R, L1, 0, 0, C.pin))
  .union(yCylinder(30, HUB_R + 12, L1, HUB_Y + 15, 0, C.fork))
  .union(yCylinder(30, HUB_R + 12, L1, -(HUB_Y + 15), 0, C.fork));
const lowerBoom = lift.part('lower-boom', lowerGeom);
lowerBoom.connector('basePivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, -1, 0],
  jointClearanceRadius: BORE_R,
});
lowerBoom.connector('tipPivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: [L1, 0, 0] },
  axis: [0, -1, 0],
  jointClearanceRadius: HUB_R,
});

// ===========================================================================
// PART: upper-boom — child collar at P1, beam, parent pin hardware at tip.
// ===========================================================================
let upperGeom = childHinge(
  roundedBox(L2 - 2 * BEAM_GAP, 240, 160, 24, L2 / 2, 0, 0, C.frame)
    .union(roundedBox(420, 170, 45, 10, L2 - 460, 0, 102, C.alu)),
);
upperGeom = upperGeom
  .union(roundedBox(60, 30, 200, 10, L2 - 90, 180, 0, C.alu))
  .union(roundedBox(60, 30, 200, 10, L2 - 90, -180, 0, C.alu))
  .union(roundedBox(80, 30, 40, 8, L2 - 160, 180, 100, C.dark))
  .union(roundedBox(80, 30, 40, 8, L2 - 160, -180, 100, C.dark))
  .union(roundedBox(80, 30, 40, 8, L2 - 160, 180, -100, C.dark))
  .union(roundedBox(80, 30, 40, 8, L2 - 160, -180, -100, C.dark))
  .union(roundedBox(55, 50, 240, 10, L2 - 172.5, 145, 0, C.dark))
  .union(roundedBox(55, 50, 240, 10, L2 - 172.5, -145, 0, C.dark))
  .union(yCylinder(HUB_Y * 2, HUB_R, L2, 0, 0, C.pin))
  .union(yCylinder(30, HUB_R + 12, L2, HUB_Y + 15, 0, C.fork))
  .union(yCylinder(30, HUB_R + 12, L2, -(HUB_Y + 15), 0, C.fork));
const upperBoom = lift.part('upper-boom', upperGeom);
upperBoom.connector('lowerPivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, -1, 0],
  jointClearanceRadius: BORE_R,
});
upperBoom.connector('platformPivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: [L2, 0, 0] },
  axis: [0, -1, 0],
  jointClearanceRadius: HUB_R,
});

// ===========================================================================
// PART: platform — level basket + workcell structure, child collar at pivot.
// ===========================================================================
let platformGeom = childHinge(
  roundedBox(990, 800, 60, 16, 635, 0, -155, C.alu)
    .union(roundedBox(1140, 36, 36, 10, 595, 0, -192, C.dark))
    .union(roundedBox(90, RAIL_HALF_Y * 2, 1000, 12, RAIL_X, 0, 375, C.dark))
    .union(roundedBox(290, 300, 300, 30, 305, -240, 25, C.blue))
    .union(roundedBox(270, 280, 24, 8, 305, -240, 187, C.alu))
    .union(zCylinder(24, 30, 430, -240, 187, C.red)),
);
for (const px of [150, 1050]) for (const sy of [-1, 1]) {
  platformGeom = platformGeom.union(zCylinder(900, 16, px, sy * 340, -125 + 450, C.alu));
}
platformGeom = platformGeom
  .union(roundedBox(60, 35, 185, 10, 130, 142.5, -92.5, C.alu))
  .union(roundedBox(60, 35, 185, 10, 130, -142.5, -92.5, C.alu))
  .union(roundedBox(980, 22, 22, 8, 600, 340, 775, C.alu))
  .union(roundedBox(980, 22, 22, 8, 600, -340, 775, C.alu))
  .union(roundedBox(22, 700, 22, 8, 150, 0, 775, C.alu));
const platform = lift.part('platform', platformGeom);
platform.connector('platformPivot', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, -1, 0],
  jointClearanceRadius: BORE_R,
});
platform.connector('railAxis', axisConnector([RAIL_X, 0, RAIL_BASE_Z], [0, 0, 1]));
platform.connector('tapeMountFace', frameConnector([680, -360, RAIL_BASE_Z]));

// ===========================================================================
// PART: carriage — C-channel in a clearance fit on the rail, gun, wrist,
// edge shield and sensors as one rigid body.
// ===========================================================================
// Robot-hand ParamRef chains (JS arithmetic on params is disallowed; derived
// refs re-evaluate on every param update, which is what the capture drives).
// The pedestal and mount OVERLAP the carriage body and each other solidly —
// exact face-to-face contact in a union chain degenerates over long capture
// runs ("no shape produced for the chain tail"), so every link shares volume.
const armProbeLen = extX.add(50);
const armProbeCx = armProbeLen.divide(2).add(230);
const armElbowCx = extX.add(280);
const armYProbeCx = extX.add(278);
const armYProbeLen = gripY.negate().add(668);
const armYProbeCy = gripY.add(664).divide(2);
const armPalmCx = extX.add(290);
const armProngCx = extX.add(300);

const carriage = lift.part('carriage',
  roundedBox(130, 25, 200, 6, 0, 72.5, 0, C.orange)
    .union(roundedBox(130, 25, 200, 6, 0, -72.5, 0, C.orange))
    .union(roundedBox(30, 300, 200, 6, 75, 0, 0, C.dark))
    .union(xCylinder(120, 34, 110, 0, 0, C.gunSilver))
    .union(roundedBox(300, 150, 130, 22, 260, 0, 0, C.gunBlue))
    .union(roundedBox(90, 100, 90, 14, 410, 0, -30, C.gunSilver))
    .union(xCylinder(200, 24, 510, 0, -40, C.dark))
    .union(xCylinder(70, 34, 620, 0, -40, C.gunSilver))
    .union(roundedBox(30, 460, 380, 10, 560, 0, -20, C.alu))
    .union(roundedBox(110, 60, 380, 12, 500, 210, -20, C.alu))
    .union(roundedBox(110, 60, 380, 12, 500, -210, -20, C.alu))
    .union(roundedBox(38, 420, 90, 6, 594, 0, -210, C.black))
    .union(roundedBox(90, 60, 50, 8, 300, 0, 90, C.dark))
    .union(roundedBox(20, 40, 30, 4, 348, 0, 90, C.glass))
    .union(roundedBox(60, 44, 40, 6, 160, 90, 60, C.dark))
    // robot hand: x-probe reaches the wall, y-slide tracks the peel front,
    // palm + prongs pinch the tape end (prongs stay 2 mm clear of the tape
    // plane so the between-parts interference check stays clean)
    .union(roundedBox(140, 554, 100, 10, 220, 337, 0, C.alu))
    .union(roundedBox(120, 140, 180, 12, 220, 664, 0, C.frame))
    .union(roundedBox(armProbeLen, 60, 60, 8, armProbeCx, 664, 0, C.gunSilver))
    .union(roundedBox(40, 80, 80, 8, armElbowCx, 664, 0, C.dark))
    .union(roundedBox(20, armYProbeLen, 44, 6, armYProbeCx, armYProbeCy, 0, C.gunSilver))
    .union(roundedBox(20, 100, 80, 8, armPalmCx, gripY, 0, C.orange))
    .union(roundedBox(20, 30, 36, 6, armProngCx, gripY.subtract(30), 0, C.orange))
    .union(roundedBox(20, 30, 36, 6, armProngCx, gripY.add(30), 0, C.orange)));
// The slide axis runs up the centre of the open channel: the rail fills the
// channel, so the declared clearance is the rail half-width to the cheeks.
carriage.connector('slideAxis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
  jointClearanceRadius: RAIL_HALF_Y,
});

// ===========================================================================
// PART: tape-applicator — robotic taping head (compliant roller + tape spool
// + cutter) on the platform deck beside the workcell. Applies edge tape
// where a sprayed mask cannot end cleanly (FerRobotics ATK-class duty).
// Authored with its mount face at the origin.
// ===========================================================================
const tapeApplicator = lift.part('tape-applicator',
  roundedBox(220, 130, 80, 12, 0, 0, 40, C.dark)
    .union(roundedBox(70, 70, 240, 10, 0, 0, 120, C.alu))
    .union(roundedBox(200, 70, 70, 10, 95, 0, 240, C.alu))
    .union(roundedBox(150, 110, 150, 16, 230, 0, 240, C.orange))
    .union(yCylinder(170, 62, 280, 0, 210, C.alu))
    .union(yCylinder(120, 75, 200, 0, 330, C.blue))
    .union(roundedBox(30, 110, 60, 8, 280, 0, 300, C.dark))
    .union(roundedBox(120, 60, 40, 8, 120, 0, 60, C.orange)));
tapeApplicator.connector('mountFace', frameConnector([0, 0, 0]));

// ===========================================================================
// SCENE PARTS — ground, wall, and the window protection stack. Unioned
// multi-colour geometry renders single-tone in this kernel, so every colour
// group is its OWN part: frame, glass, mask film, the two tape strips and the
// two foam zones. All are authored in the wall coordinate frame (origin at
// the wall foot, wall face at x = 0, lift side at -x) and each is fastened
// to the part that carries it, at a seat on the face the two parts share.
// The window is centred on y = 0 so the robot hand's lateral stroke can wrap
// the tape ring.
// ===========================================================================
const WALL_FACE_X = 0;      // facade face toward the lift
const FRAME_FRONT_X = -165; // frame bars stand this proud of the wall
const SILL_FRONT_X = -195;  // sill front, carries the mask film
const SILL_Z0 = 3315;       // sill underside
const OPEN_Y = 900;         // frame opening width (glass seat)
const OPEN_Z0 = 3470;       // frame opening bottom
const OPEN_Z1 = 4930;       // frame opening top
const TAPE_Y0 = -620;       // tape strips start here and run to +620
const TAPE_T = 8;
const TAPE_W = 60;
const TAPE_TOP_Z0 = 5130;
const TAPE_BOTTOM_Z0 = 3190;
const FOAM_T = 20;
const FOAM_LOWER_Z0 = 2400;
const FOAM_UPPER_Z1 = 5300;
const FILM_T = 16;

const ground = lift.part('ground', roundedBox(7600, 4400, 60, 30, 900, 0, -30, C.ground));
ground.connector('baseFace', frameConnector(BASE_SEAT));
ground.connector('wallFoot', frameConnector([WALL_X + 60, 0, 0]));

// geometry drivers — every one of these tracks its tool in the animation.
// Each grown box is anchored at a fixed corner and only its size takes the
// param, so the part stays put on its fastened seat while it grows.
const hFilm = maskProgress.multiply(1780).add(4);                          // 3315 -> 5099
const lenTapeTop = tapeTopP.multiply(peelTopP.negate().add(1)).multiply(1240).add(4);
const lenTapeBottom = tapeBottomP.multiply(peelBottomP.negate().add(1)).multiply(1240).add(4);
// The foam zones stop at the tape lines: the tape masks the wall next to the
// window, so the bands meet the strips edge to edge instead of covering them.
const hFoamLower = foamLowerP.multiply(TAPE_BOTTOM_Z0 - FOAM_LOWER_Z0 - 4).add(4);              // 2400 -> 3190
const hFoamUpper = foamUpperP.multiply(FOAM_UPPER_Z1 - (TAPE_TOP_Z0 + TAPE_W) - 4).add(4);      // 5190 -> 5300

const facade = lift.part('facade', roundedBox(120, 3600, 5600, 6, 60, 0, 2800, C.wall)
  .union(roundedBox(100, 3560, 5480, 4, 55, 0, 2800, C.wallFace)));
facade.connector('wallFoot', frameConnector([60, 0, 0]));   // centre of the wall footing

// proud white window frame (4 bars + sill), centred on y = 0, bedded on the
// wall face
const frame = lift.part('frame',
  roundedBox(-FRAME_FRONT_X, 1120, 110, 8, FRAME_FRONT_X / 2, 0, 4985, C.windowFrame)
    .union(roundedBox(-FRAME_FRONT_X, 1120, 110, 8, FRAME_FRONT_X / 2, 0, 3415, C.windowFrame))
    .union(roundedBox(-FRAME_FRONT_X, 110, 1520, 8, FRAME_FRONT_X / 2, -505, 4200, C.windowFrame))
    .union(roundedBox(-FRAME_FRONT_X, 110, 1520, 8, FRAME_FRONT_X / 2, 505, 4200, C.windowFrame))
    .union(roundedBox(-SILL_FRONT_X, 1120, 60, 10, SILL_FRONT_X / 2, 0, SILL_Z0 + 30, C.sill)));

// near-black glass pane filling the frame opening
const glass = lift.part('glass',
  roundedBox(26, OPEN_Y, OPEN_Z1 - OPEN_Z0, 8, -65, 0, (OPEN_Z0 + OPEN_Z1) / 2, C.glassDeep));

// peelable mask film covering the WHOLE window (frame + sill), bottom-up,
// growing exactly with the spray pass; it starts on the sill front
const film = lift.part('film',
  box(FILM_T, 1200, hFilm).translate(SILL_FRONT_X - FILM_T, -600, SILL_Z0).color(C.maskBlue));

// masking tape strips AROUND the window, ON THE WALL (not on the frame) —
// one part per strip; the robot hand applies and later peels each strip
const tapeTop = lift.part('tape-top',
  box(TAPE_T, lenTapeTop, TAPE_W).translate(WALL_FACE_X - TAPE_T, TAPE_Y0, TAPE_TOP_Z0).color(C.tape));
const tapeBottom = lift.part('tape-bottom',
  box(TAPE_T, lenTapeBottom, TAPE_W).translate(WALL_FACE_X - TAPE_T, TAPE_Y0, TAPE_BOTTOM_Z0).color(C.tape));

// spray-foam zones: band below the window (top edge grows with the climbing
// gun) and the strip above it (appears as the gun exits the masked zone)
const foamLower = lift.part('foam-lower',
  box(FOAM_T, 3200, hFoamLower).translate(WALL_FACE_X - FOAM_T, -1600, FOAM_LOWER_Z0).color(C.foam));
const foamUpper = lift.part('foam-upper',
  box(FOAM_T, 3200, hFoamUpper).translate(WALL_FACE_X - FOAM_T, -1600, TAPE_TOP_Z0 + TAPE_W).color(C.foam));

// Seats, in the wall frame. Each is a point on the face the two parts share,
// inside the smallest (rest) size of a grown part.
const seat = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
const SEATS = {
  frame: seat(WALL_FACE_X, 0, SILL_Z0 + 30),
  glass: seat(-65, 0, OPEN_Z0),
  film: seat(SILL_FRONT_X, 0, SILL_Z0 + 2),
  tapeTop: seat(WALL_FACE_X, TAPE_Y0 + 2, TAPE_TOP_Z0 + TAPE_W / 2),
  tapeBottom: seat(WALL_FACE_X, TAPE_Y0 + 2, TAPE_BOTTOM_Z0 + TAPE_W / 2),
  foamLower: seat(WALL_FACE_X, 0, FOAM_LOWER_Z0 + 2),
  foamUpper: seat(WALL_FACE_X, 0, TAPE_TOP_Z0 + TAPE_W + 2),
};
facade.connector('frameSeat', frameConnector(SEATS.frame));
frame.connector('wallSeat', frameConnector(SEATS.frame));
frame.connector('glassSeat', frameConnector(SEATS.glass));
glass.connector('frameSeat', frameConnector(SEATS.glass));
frame.connector('filmSeat', frameConnector(SEATS.film));
film.connector('sillSeat', frameConnector(SEATS.film));
facade.connector('tapeTopSeat', frameConnector(SEATS.tapeTop));
tapeTop.connector('wallSeat', frameConnector(SEATS.tapeTop));
facade.connector('tapeBottomSeat', frameConnector(SEATS.tapeBottom));
tapeBottom.connector('wallSeat', frameConnector(SEATS.tapeBottom));
facade.connector('foamLowerSeat', frameConnector(SEATS.foamLower));
foamLower.connector('wallSeat', frameConnector(SEATS.foamLower));
facade.connector('foamUpperSeat', frameConnector(SEATS.foamUpper));
foamUpper.connector('wallSeat', frameConnector(SEATS.foamUpper));

// ===========================================================================
// MATES — full kinematic graph.
// ===========================================================================
lift.mate('base-on-ground', 'base.groundFace', 'ground.baseFace', 'fastened');
lift.mate('facade-on-ground', 'ground.wallFoot', 'facade.wallFoot', 'fastened');
lift.mate('frame-on-facade', 'facade.frameSeat', 'frame.wallSeat', 'fastened');
lift.mate('glass-in-frame', 'frame.glassSeat', 'glass.frameSeat', 'fastened');
lift.mate('film-on-sill', 'frame.filmSeat', 'film.sillSeat', 'fastened');
lift.mate('tape-top-on-facade', 'facade.tapeTopSeat', 'tape-top.wallSeat', 'fastened');
lift.mate('tape-bottom-on-facade', 'facade.tapeBottomSeat', 'tape-bottom.wallSeat', 'fastened');
lift.mate('foam-lower-on-facade', 'facade.foamLowerSeat', 'foam-lower.wallSeat', 'fastened');
lift.mate('foam-upper-on-facade', 'facade.foamUpperSeat', 'foam-upper.wallSeat', 'fastened');
lift.mate('lower-boom-pivot', 'base.lowerPivot', 'lower-boom.basePivot', 'revolute', {
  pose: lowerDeg,
  limitsDeg: [68, 72],
});
lift.mate('upper-boom-pivot', 'lower-boom.tipPivot', 'upper-boom.lowerPivot', 'revolute', {
  pose: upperRelDeg,
  limitsDeg: [-120, -40],
});
lift.mate('platform-leveling', 'upper-boom.platformPivot', 'platform.platformPivot', 'revolute', {
  pose: platformRelDeg,
  limitsDeg: [-60, 60],
});
lift.mate('carriage-slide', 'platform.railAxis', 'carriage.slideAxis', 'prismatic', {
  pose: carriageMm,
  limitsMm: [260, 760],
});
lift.mate('tape-applicator-mount', 'platform.tapeMountFace', 'tape-applicator.mountFace', 'fastened');

// ===========================================================================
// ANIMATION — the service cycle, every action tracking its tool (~17.8 s):
//   1. mask pass — the gun climbs the window; the film grows with it
//   2. tape strips — the hand sweeps each strip ON THE WALL above and below
//      the window; strips grow exactly with the hand's leading edge
//   3. foam pass — the gun climbs the whole wall; the lower band's top edge
//      tracks the nozzle, stalls at the masked window, then the upper strip
//      appears as the gun exits over it
//   4. peel — the hand sweeps back along each strip; each shrinks with it
//   5. hand stows, boom returns to the start pose
// Motion rule: the lateral bar is always SHORT (gripY ~620) while the hand
// extends or retracts, and grows only at the wall, so it can never sweep
// through the platform structure. platformRelDeg mirrors upperRelDeg so the
// deck stays level throughout.
// ===========================================================================
animationView({
  name: 'mask-tape-spray-peel-cycle',
  tracks: [
    {
      param: 'upperRelDeg',
      keys: [
        { atMs: 0, value: -104 },
        { atMs: 300, value: -104 },
        { atMs: 700, value: -77, ease: 'easeInOut' },
        { atMs: 2400, value: -40 },
        { atMs: 4800, value: -40 },
        { atMs: 5500, value: -83, ease: 'easeInOut' },
        { atMs: 7600, value: -83 },
        { atMs: 8200, value: -104, ease: 'easeInOut' },
        { atMs: 11600, value: -40 },
        { atMs: 13900, value: -40 },
        { atMs: 14700, value: -83, ease: 'easeInOut' },
        { atMs: 16800, value: -83 },
        { atMs: 17600, value: -104, ease: 'easeInOut' },
        { atMs: 17800, value: -104 },
      ],
    },
    {
      param: 'platformRelDeg',
      keys: [
        { atMs: 0, value: 34 },
        { atMs: 300, value: 34 },
        { atMs: 700, value: 7, ease: 'easeInOut' },
        { atMs: 2400, value: -30 },
        { atMs: 4800, value: -30 },
        { atMs: 5500, value: 13, ease: 'easeInOut' },
        { atMs: 7600, value: 13 },
        { atMs: 8200, value: 34, ease: 'easeInOut' },
        { atMs: 11600, value: -30 },
        { atMs: 13900, value: -30 },
        { atMs: 14700, value: 13, ease: 'easeInOut' },
        { atMs: 16800, value: 13 },
        { atMs: 17600, value: 34, ease: 'easeInOut' },
        { atMs: 17800, value: 34 },
      ],
    },
    {
      param: 'carriageMm',
      keys: [
        { atMs: 0, value: 260 },
        { atMs: 300, value: 260 },
        { atMs: 2400, value: 550 },
        { atMs: 2700, value: 642, ease: 'easeInOut' },
        { atMs: 4800, value: 642 },
        { atMs: 5500, value: 297, ease: 'easeInOut' },
        { atMs: 7600, value: 297 },
        { atMs: 8200, value: 260, ease: 'easeInOut' },
        { atMs: 11600, value: 760 },
        { atMs: 11900, value: 642, ease: 'easeInOut' },
        { atMs: 13900, value: 642 },
        { atMs: 14700, value: 297, ease: 'easeInOut' },
        { atMs: 16800, value: 297 },
        { atMs: 17600, value: 260, ease: 'easeInOut' },
        { atMs: 17800, value: 260 },
      ],
    },
    {
      param: 'extX',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 2700, value: 0 },
        { atMs: 2900, value: 954, ease: 'easeInOut' },
        { atMs: 4100, value: 954 },
        { atMs: 4500, value: 0, ease: 'easeInOut' },
        { atMs: 5500, value: 0 },
        { atMs: 5700, value: 715, ease: 'easeInOut' },
        { atMs: 7200, value: 715 },
        { atMs: 7600, value: 0, ease: 'easeInOut' },
        { atMs: 11900, value: 0 },
        { atMs: 12100, value: 954, ease: 'easeInOut' },
        { atMs: 13300, value: 954 },
        { atMs: 13500, value: 0, ease: 'easeInOut' },
        { atMs: 14700, value: 0 },
        { atMs: 14900, value: 715, ease: 'easeInOut' },
        { atMs: 16100, value: 715 },
        { atMs: 16400, value: 0, ease: 'easeInOut' },
        { atMs: 17800, value: 0 },
      ],
    },
    {
      param: 'gripY',
      keys: [
        { atMs: 0, value: 664 },
        { atMs: 2900, value: 664 },
        { atMs: 3100, value: -660, ease: 'easeInOut' },
        { atMs: 4100, value: 660 },
        { atMs: 4500, value: 660 },
        { atMs: 4800, value: 664, ease: 'easeInOut' },
        { atMs: 5700, value: 664 },
        { atMs: 5900, value: -660, ease: 'easeInOut' },
        { atMs: 6900, value: 660 },
        { atMs: 7200, value: 664, ease: 'easeInOut' },
        { atMs: 12100, value: 664 },
        { atMs: 12300, value: 660, ease: 'easeInOut' },
        { atMs: 13300, value: -660 },
        { atMs: 13500, value: 664, ease: 'easeInOut' },
        { atMs: 14900, value: 664 },
        { atMs: 15100, value: -660, ease: 'easeInOut' },
        { atMs: 16100, value: 660 },
        { atMs: 16400, value: 664, ease: 'easeInOut' },
        { atMs: 17800, value: 664 },
      ],
    },
    {
      param: 'maskProgress',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 700, value: 0 },
        { atMs: 2400, value: 1 },
        { atMs: 17800, value: 1 },
      ],
    },
    {
      param: 'tapeTopP',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 3100, value: 0 },
        { atMs: 4100, value: 1 },
        { atMs: 17800, value: 1 },
      ],
    },
    {
      param: 'tapeBottomP',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 5900, value: 0 },
        { atMs: 6900, value: 1 },
        { atMs: 17800, value: 1 },
      ],
    },
    {
      param: 'peelTopP',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 12300, value: 0 },
        { atMs: 13300, value: 1 },
        { atMs: 17800, value: 1 },
      ],
    },
    {
      param: 'peelBottomP',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 15100, value: 0 },
        { atMs: 16100, value: 1 },
        { atMs: 17800, value: 1 },
      ],
    },
    {
      param: 'foamLowerP',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 8200, value: 0 },
        { atMs: 9200, value: 1 },
        { atMs: 17800, value: 1 },
      ],
    },
    {
      param: 'foamUpperP',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 11250, value: 0 },
        { atMs: 11600, value: 1 },
        { atMs: 17800, value: 1 },
      ],
    },
  ],
  fps: 30,
});

return lift.model();

// ===========================================================================
// SOURCES — the masking/technology stack this concept points at:
//   - FerRobotics Active Taping Kit (robotic tape applicator, aerospace/
//     automotive): https://www.ferrobotics.com/en/services/products/active-taping-kit-atk-robotic-masking-tape-applicator-end-effector
//   - Protectapeel (airless spray-on peelable masking, construction glass):
//     https://protectapeel.com/index.php/2026/08/25/protect-windows-during-construction
//   - Skudo Glass Advanced (sprayable peelable window protection):
//     https://www.skudousa.com/products/glass-advanced
//   - Dymax SpeedMask + MTU Aero Engines automated masking case:
//     https://dymax.com/resources/case-studies/automated-masking-system-revolutionizes-surface-treatment-processing
//   - Fraunhofer IFAM (robot-guided adhesive film placement):
//     https://www.ifam.fraunhofer.de/en/technologies/automated-application-adhesive-tapes.html
// ===========================================================================
