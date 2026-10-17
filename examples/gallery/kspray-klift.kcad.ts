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

const C = {
  frame: '#27343d', dark: '#18232a', orange: '#f0782f', amber: '#f6b23b',
  gunBlue: '#1769aa', gunSilver: '#c5cdd1',
  ivory: '#e8e4d9', alu: '#aeb8bd', black: '#15191c', rubber: '#202326',
  red: '#d7222b', blue: '#315c72', glass: '#315c72',
  wall: '#e9e0d4', wallFace: '#f2ebdf', mask: '#eef7fb', ground: '#d8d4cc',
  windowFrame: '#f5f2ec', sill: '#dcd6cb',
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
    .union(roundedBox(60, 44, 40, 6, 160, 90, 60, C.dark)));
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
    .union(roundedBox(150, 110, 150, 16, 200, 0, 240, C.orange))
    .union(yCylinder(170, 62, 280, 0, 210, C.alu))
    .union(yCylinder(120, 75, 200, 0, 330, C.blue))
    .union(roundedBox(30, 110, 60, 8, 280, 0, 300, C.dark))
    .union(roundedBox(120, 60, 40, 8, 120, 0, 60, C.orange)));
tapeApplicator.connector('mountFace', frameConnector([0, 0, 0]));

// ===========================================================================
// SCENE PARTS — ground and facade (wall + recessed windows + mask film).
// ===========================================================================
const ground = lift.part('ground', roundedBox(7600, 4400, 60, 30, 900, 0, -30, C.ground));
ground.connector('baseFace', frameConnector([0, 0, 0]));
ground.connector('wallFoot', frameConnector([WALL_X, 0, 0]));

let facadeGeom = roundedBox(120, 3600, 5600, 6, 60, 0, 2800, C.wall)
  .union(roundedBox(100, 3560, 5480, 4, 50, 0, 2800, C.wallFace));
for (const sy of [-1, 1]) {
  const wy = sy * 850;
  facadeGeom = facadeGeom
    // recessed dark glass inside a proud light frame
    .union(roundedBox(26, 980, 1380, 8, -20, wy, 4200, C.glass))
    .union(roundedBox(60, 1120, 70, 8, -45, wy, 4200 + 715, C.windowFrame))
    .union(roundedBox(60, 1120, 70, 8, -45, wy, 4200 - 715, C.windowFrame))
    .union(roundedBox(60, 70, 1360, 8, -45, wy - 525, 4200, C.windowFrame))
    .union(roundedBox(60, 70, 1360, 8, -45, wy + 525, 4200, C.windowFrame))
    // sprayed-on peelable mask film over the pane, bright so it reads grey-on-grey
    .union(roundedBox(14, 1000, 1390, 6, -62, wy, 4200, C.mask))
    .union(roundedBox(24, 130, 46, 6, -72, wy - 420, 3560, C.alu))
    // sill
    .union(roundedBox(120, 1180, 40, 8, -60, wy, 3480, C.sill));
}
const facade = lift.part('facade', facadeGeom);
facade.connector('wallFoot', frameConnector([0, 0, 0]));

// ===========================================================================
// MATES — full kinematic graph.
// ===========================================================================
lift.mate('base-on-ground', 'base.groundFace', 'ground.baseFace', 'fastened');
lift.mate('facade-on-ground', 'ground.wallFoot', 'facade.wallFoot', 'fastened');
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
// ANIMATION — working pose -> two spray passes -> stow low -> back to work.
// platformRelDeg mirrors upperRelDeg so the deck stays level throughout.
// ===========================================================================
animationView({
  name: 'lift-and-spray-cycle',
  tracks: [
    {
      param: 'upperRelDeg',
      keys: [
        { atMs: 0, value: -40 },
        { atMs: 3400, value: -40 },
        { atMs: 5200, value: -120, ease: 'easeInOut' },
        { atMs: 6400, value: -120 },
        { atMs: 8000, value: -40, ease: 'easeInOut' },
      ],
    },
    {
      param: 'platformRelDeg',
      keys: [
        { atMs: 0, value: -30 },
        { atMs: 3400, value: -30 },
        { atMs: 5200, value: 50, ease: 'easeInOut' },
        { atMs: 6400, value: 50 },
        { atMs: 8000, value: -30, ease: 'easeInOut' },
      ],
    },
    {
      param: 'carriageMm',
      keys: [
        { atMs: 0, value: 260 },
        { atMs: 300, value: 260 },
        { atMs: 1600, value: 700, ease: 'easeInOut' },
        { atMs: 2900, value: 260, ease: 'easeInOut' },
        { atMs: 3400, value: 260 },
        { atMs: 8000, value: 260 },
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
