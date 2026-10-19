// K-Spray K-Lift — spray workcell on a certified boom lift (pitch concept).
// Z-up, millimetres. Proper kinematic build:
//   - every rigid body is ONE part (no interpenetrating subassemblies)
//   - the three boom/platform joints use the shared-pin hinge pattern:
//     parent = beam end + stub + pin hub; child = collar (clearance bore)
//     + cheek plates + flange. All clearances are rotation-invariant
//     (surfaces of revolution about the joint axis, or Y-band plates),
//     so the mechanism stays collision-free across every pose.
//   - the gun carriage rides the workcell rail on a prismatic mate with a
//     clearance fit
//   - every part is mated: scene parts fastened, chain revolute, carriage
//     prismatic — no floating parts
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
  min: 0, max: 900,
  description: 'Robot-hand reach toward the facade (mm). 0 = stowed, 799 = at the window edge (working pose).',
});
const gripY = param('gripY', 590, {
  min: -600, max: 600,
  description: 'Robot-hand lateral position along the wall (mm); tracks the peeling tape front.',
});
const peelTop = param('peelTop', 0, {
  min: 0, max: 1,
  description: 'Top masking-tape peel progress (0 = applied, 1 = removed).',
});
const peelBottom = param('peelBottom', 0, {
  min: 0, max: 1,
  description: 'Bottom masking-tape peel progress (0 = applied, 1 = removed).',
});
const tapeProgress = param('tapeProgress', 0, {
  min: 0, max: 1,
  description: 'Masking-tape application progress along the film edges (left-to-right).',
});
const maskProgress = param('maskProgress', 0, {
  min: 0, max: 1,
  description: 'Peelable mask-film coverage over the window glass (applied top-down).',
});
const foamProgress = param('foamProgress', 0, {
  min: 0, max: 1,
  description: 'Spray-foam insulation band below the window strip (bottom-up).',
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
};

// ---- scene constants ------------------------------------------------------
const WALL_X = 3700;
const P0: [number, number, number] = [-800, 0, 1100];   // base <-> lower boom
const L1 = 2600;                                        // lower boom length
const L2 = 2200;                                        // upper boom length
const RAIL_X = 420;                                     // workcell rail x on the platform
const RAIL_BASE_Z = -125;                               // rail base (deck top) in platform frame

// Shared hinge hardware. The pattern keeps 5 mm radial clearance between the
// pin hub and the collar bore, and 5-25 mm Y-band clearance everywhere else.
const HUB_R = 95;          // parent pin hub radius (contains the pivot point)
const BORE_R = 100;        // child collar bore (joint clearance, declared to the mate)
const COLLAR_R = 140;      // child collar outer radius
const HUB_Y = 200;         // pin hub half-width (spans the cheek plates)
const COLLAR_Y = 160;      // child collar half-width
const BEAM_GAP = 150;      // beam ends stop this far short of the pivot

setCameraTarget(1100, 0, 2700);

// ---- shape helpers --------------------------------------------------------
function zCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).translate(x, y, z - h / 2).color(color);
}
function yCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).alongAxis([0, 1, 0]).translate(x, y - h / 2, z).color(color);
}
function xCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).alongAxis([1, 0, 0]).translate(x - h / 2, y, z).color(color);
}
function roundedBox(x: number, y: number, z: number, r: number, cx: number, cy: number, cz: number, color: string) {
  return box(x, y, z, true).translate(cx, cy, cz).color(color);
}
function frameConnector(origin: [number, number, number]) {
  return { type: 'frame', origin: { kind: 'vec3', value: origin } };
}
function axisConnector(origin: [number, number, number], axis: [number, number, number]) {
  return { type: 'axis', origin: { kind: 'vec3', value: origin }, axis };
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
base.connector('groundFace', frameConnector([0, 0, 0]));
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
    .union(roundedBox(90, 120, 1000, 12, RAIL_X, 0, 375, C.dark))
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
const armYProbeLen = gripY.negate().add(594);
const armYProbeCy = gripY.add(590).divide(2);
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
    .union(roundedBox(140, 480, 100, 10, 220, 300, 0, C.alu))
    .union(roundedBox(120, 140, 180, 12, 220, 590, 0, C.frame))
    .union(roundedBox(armProbeLen, 60, 60, 8, armProbeCx, 590, 0, C.gunSilver))
    .union(roundedBox(40, 80, 80, 8, armElbowCx, 590, 0, C.dark))
    .union(roundedBox(20, armYProbeLen, 44, 6, armYProbeCx, armYProbeCy, 0, C.gunSilver))
    .union(roundedBox(20, 100, 80, 8, armPalmCx, gripY, 0, C.orange))
    .union(roundedBox(20, 30, 36, 6, armProngCx, gripY.subtract(30), 0, C.orange))
    .union(roundedBox(20, 30, 36, 6, armProngCx, gripY.add(30), 0, C.orange)));
carriage.connector('slideAxis', axisConnector([0, 0, 0], [0, 0, 1]));

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
// group of the window assembly is its OWN mated part: frames, glass, mask
// film, the two tape strips and the foam band. All of them share the wall
// coordinate frame (connectors at the origin, mated fastened to the ground).
// ===========================================================================
const ground = lift.part('ground', roundedBox(7600, 4400, 60, 30, 900, 0, -30, C.ground));
ground.connector('baseFace', frameConnector([0, 0, 0]));
ground.connector('wallFoot', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootFrame1', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootFrame2', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootGlass1', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootGlass2', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootFilm1', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootFilm2', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootTapeTop', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootTapeBottom', frameConnector([WALL_X, 0, 0]));
ground.connector('wallFootFoam', frameConnector([WALL_X, 0, 0]));

const hFilm = maskProgress.multiply(1430).add(4);                // grows/shrinks top-down
const lenTopTape = tapeProgress.multiply(peelTop.negate().add(1)).multiply(1180).add(4);
const lenBottomTape = tapeProgress.multiply(peelBottom.negate().add(1)).multiply(1180).add(4);
const hFoam = foamProgress.multiply(2700).add(4);                // grows bottom-up

const facade = lift.part('facade', roundedBox(120, 3600, 5600, 6, 60, 0, 2800, C.wall)
  .union(roundedBox(100, 3560, 5480, 4, 50, 0, 2800, C.wallFace)));
facade.connector('wallFoot', frameConnector([0, 0, 0]));

// proud white window frames (4 bars + sill per window; one part per window —
// the two windows are separate bodies and union() rejects disconnected sums)
function windowFrames(wy: number) {
  return roundedBox(110, 1260, 110, 8, -110, wy, 4200 + 785, C.windowFrame)
    .union(roundedBox(110, 1260, 110, 8, -110, wy, 4200 - 785, C.windowFrame))
    .union(roundedBox(110, 110, 1520, 8, -110, wy - 575, 4200, C.windowFrame))
    .union(roundedBox(110, 110, 1520, 8, -110, wy + 575, 4200, C.windowFrame))
    .union(roundedBox(150, 1360, 60, 10, -120, wy, 3330, C.sill));
}
const frame1 = lift.part('frame-1', windowFrames(-850));
frame1.connector('wallFoot', frameConnector([0, 0, 0]));
const frame2 = lift.part('frame-2', windowFrames(850));
frame2.connector('wallFoot', frameConnector([0, 0, 0]));

// near-black glass panes, floating 30 mm inside the frame openings
const glass1 = lift.part('glass-1', roundedBox(26, 1030, 1400, 8, -65, -850, 4200, C.glassDeep));
glass1.connector('wallFoot', frameConnector([0, 0, 0]));
const glass2 = lift.part('glass-2', roundedBox(26, 1030, 1400, 8, -65, 850, 4200, C.glassDeep));
glass2.connector('wallFoot', frameConnector([0, 0, 0]));

// peelable mask film on the glass (applied top-down, peeled for removal)
const film1 = lift.part('film-1',
  roundedBox(16, 1030, hFilm, 6, -88, -850, hFilm.negate().divide(2).add(4920), C.maskBlue));
film1.connector('wallFoot', frameConnector([0, 0, 0]));
const film2 = lift.part('film-2',
  roundedBox(16, 1030, hFilm, 6, -88, 850, hFilm.negate().divide(2).add(4920), C.maskBlue));
film2.connector('wallFoot', frameConnector([0, 0, 0]));

// masking tape sealing the film edges to the frame (applied left-to-right,
// peeled right-to-left by the robot hand) — one part per strip so each can
// peel on its own schedule
const tapeTop = lift.part('tape-top',
  roundedBox(8, lenTopTape, 60, 3, -171, lenTopTape.divide(2).subtract(590), 4930, C.tape));
tapeTop.connector('wallFoot', frameConnector([0, 0, 0]));
const tapeBottom = lift.part('tape-bottom',
  roundedBox(8, lenBottomTape, 60, 3, -171, lenBottomTape.divide(2).subtract(590), 3440, C.tape));
tapeBottom.connector('wallFoot', frameConnector([0, 0, 0]));

// spray-foam insulation band below the window strip, growing bottom-up
const foamBand = lift.part('foam-band',
  roundedBox(30, 3200, hFoam, 6, -20, 0, hFoam.divide(2).add(600), C.foam));
foamBand.connector('wallFoot', frameConnector([0, 0, 0]));

// ===========================================================================
// MATES — full kinematic graph.
// ===========================================================================
lift.mate('base-on-ground', 'base.groundFace', 'ground.baseFace', 'fastened');
lift.mate('facade-on-ground', 'ground.wallFoot', 'facade.wallFoot', 'fastened');
lift.mate('frame-1-on-ground', 'ground.wallFootFrame1', 'frame-1.wallFoot', 'fastened');
lift.mate('frame-2-on-ground', 'ground.wallFootFrame2', 'frame-2.wallFoot', 'fastened');
lift.mate('glass-1-on-ground', 'ground.wallFootGlass1', 'glass-1.wallFoot', 'fastened');
lift.mate('glass-2-on-ground', 'ground.wallFootGlass2', 'glass-2.wallFoot', 'fastened');
lift.mate('film-1-on-ground', 'ground.wallFootFilm1', 'film-1.wallFoot', 'fastened');
lift.mate('film-2-on-ground', 'ground.wallFootFilm2', 'film-2.wallFoot', 'fastened');
lift.mate('tape-top-on-ground', 'ground.wallFootTapeTop', 'tape-top.wallFoot', 'fastened');
lift.mate('tape-bottom-on-ground', 'ground.wallFootTapeBottom', 'tape-bottom.wallFoot', 'fastened');
lift.mate('foam-on-ground', 'ground.wallFootFoam', 'foam-band.wallFoot', 'fastened');
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
// ANIMATION — the full service cycle (15 s loop):
//   1. mask film sprayed onto the window glass (top-down)
//   2. masking tape applied along the film edges (left-to-right)
//   3. spray-foam insulation pass: boom climbs, foam band grows bottom-up
//   4. robot hand peels the TOP tape (gripper y tracks the peel front)
//   5. boom descends to the lower edge, hand peels the BOTTOM tape
//   6. film peeled off, boom returns to the start pose
// platformRelDeg mirrors upperRelDeg so the deck stays level throughout.
// The hand always sweeps its lateral stroke AT the wall and retracts to a
// stub (gripY 590) before any x-retract or boom move, so the y-slide can
// never cross the tape-applicator on the platform. Film/tape/foam are
// geometry driven directly by progress params (re-meshed per frame).
// ===========================================================================
animationView({
  name: 'mask-tape-spray-peel-cycle',
  tracks: [
    {
      param: 'upperRelDeg',
      keys: [
        { atMs: 0, value: -90 },
        { atMs: 3300, value: -90 },
        { atMs: 6100, value: -40, ease: 'easeInOut' },
        { atMs: 10800, value: -40 },
        { atMs: 11600, value: -77, ease: 'easeInOut' },
        { atMs: 14400, value: -77 },
        { atMs: 15000, value: -90, ease: 'easeInOut' },
      ],
    },
    {
      param: 'platformRelDeg',
      keys: [
        { atMs: 0, value: 20 },
        { atMs: 3300, value: 20 },
        { atMs: 6100, value: -30, ease: 'easeInOut' },
        { atMs: 10800, value: -30 },
        { atMs: 11600, value: 7, ease: 'easeInOut' },
        { atMs: 14400, value: 7 },
        { atMs: 15000, value: 20, ease: 'easeInOut' },
      ],
    },
    {
      param: 'carriageMm',
      keys: [
        { atMs: 0, value: 260 },
        { atMs: 3300, value: 260 },
        { atMs: 6100, value: 760, ease: 'easeInOut' },
        { atMs: 7100, value: 412, ease: 'easeInOut' },
        { atMs: 10800, value: 412 },
        { atMs: 11600, value: 290, ease: 'easeInOut' },
        { atMs: 14400, value: 290 },
        { atMs: 15000, value: 260, ease: 'easeInOut' },
      ],
    },
    {
      param: 'foamProgress',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 3300, value: 0 },
        { atMs: 6100, value: 1 },
        { atMs: 15000, value: 1 },
      ],
    },
    {
      param: 'maskProgress',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 300, value: 0 },
        { atMs: 1900, value: 1 },
        { atMs: 14400, value: 1 },
        { atMs: 15000, value: 0 },
      ],
    },
    {
      param: 'tapeProgress',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 1900, value: 0 },
        { atMs: 3300, value: 1 },
        { atMs: 15000, value: 1 },
      ],
    },
    {
      param: 'peelTop',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 8100, value: 0 },
        { atMs: 10100, value: 1 },
        { atMs: 15000, value: 1 },
      ],
    },
    {
      param: 'peelBottom',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 12000, value: 0 },
        { atMs: 13600, value: 1 },
        { atMs: 15000, value: 1 },
      ],
    },
    {
      param: 'extX',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 7100, value: 0 },
        { atMs: 8100, value: 799, ease: 'easeInOut' },
        { atMs: 10450, value: 799 },
        { atMs: 10800, value: 0, ease: 'easeInOut' },
        { atMs: 11600, value: 0 },
        { atMs: 12000, value: 520, ease: 'easeInOut' },
        { atMs: 14050, value: 520 },
        { atMs: 14400, value: 0, ease: 'easeInOut' },
        { atMs: 15000, value: 0 },
      ],
    },
    {
      param: 'gripY',
      keys: [
        { atMs: 0, value: 590 },
        { atMs: 8100, value: 590 },
        { atMs: 10100, value: -590 },
        { atMs: 10450, value: 590, ease: 'easeInOut' },
        { atMs: 12000, value: 590 },
        { atMs: 13600, value: -590 },
        { atMs: 14050, value: 590, ease: 'easeInOut' },
        { atMs: 15000, value: 590 },
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
