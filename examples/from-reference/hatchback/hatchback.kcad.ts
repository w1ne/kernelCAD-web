// Real Object Brief
// Artifact: a generic five-door compact hatchback, ported from an existing
//   open model instead of free-handed: the body is lofted through station
//   sections MEASURED from the OSRF Gazebo `hatchback` mesh.
// Source: OSRF gazebo_models `hatchback/meshes/hatchback.obj`, Copyright 2012 Nathan Koenig,
//   CC-BY 3.0 (https://github.com/osrf/gazebo_models, commit 8163eb4b).
//   Unbranded; see ./PROVENANCE.md for the license, checksum and extraction.
// Scale: millimetres. Source envelope 4001 L x 1880 W (body, no mirrors) x
//   1568 H, wheelbase 2516, tyre Ø641, half-track 787, sill 196 above ground.
// How the port works:
//   - `extract-stations.py` slices the source mesh every 10 mm along its
//     length, takes the convex section hull, smooths along the length and
//     samples the numbers in LOWER / GREENHOUSE below (half-widths `w` and
//     heights `z` in source mm; `s` = distance from the front bumper). A few
//     cells are hand-faired where the coarse mesh kinks; PROVENANCE.md lists
//     every one.
//   - Each row becomes a closed degree-3 `nurbsSegment` section on a YZ
//     plane at x = s. Every section has the same control-point count, so the
//     loft gets compatible sections without re-parametrisation.
//   - Rows are lofted in short runs (`loftStations`, 3 spans each) and fused:
//     one ThruSections over 10+ stations tessellates extremely slowly.
//   - The lower body and the greenhouse are separate lofts unioned at the
//     beltline. Glass is a 4 mm skin (greenhouse loft grown 4 mm, minus the
//     cabin) intersected with a window mask, kept as its own part (no
//     through-cut into the body). Lamps reuse the same trick on nose / tail.
//   - Source row values are remapped through `param()`s, so length, width,
//     height, wheelbase and ride height stretch the measured shape piecewise
//     (front overhang / wheelbase / rear overhang scale independently).
// Validation focus:
//   - Side: long roof with a steep tailgate, short bonnet, raked
//     windscreen, three side windows with B/C pillars, arches around the tyres.
//   - Front / rear: tumblehome greenhouse narrower than the shoulders,
//     headlamps / intake / tail lamps at the source positions.
//   - Every part watertight on export; no interference between glass and body.
//
// RUN
//   node dist/cli/index.js evaluate examples/from-reference/hatchback/hatchback.kcad.ts
//   node dist/cli/index.js export stl examples/from-reference/hatchback/hatchback.kcad.ts --parts all -o /tmp/hatchback
//   node dist/cli/index.js render examples/from-reference/hatchback/hatchback.kcad.ts -o /tmp/hatchback.png \
//     --separate --pose 180,0 --pose -90,0 --pose -130,22 --no-mechanism-check  # side, front, 3/4 front
//   node dist/cli/index.js interference examples/from-reference/hatchback/hatchback.kcad.ts

// --- Editable parameters (defaults = source model) ---------------------------
const length = param('length', 4001, { min: 3600, max: 4600, description: 'overall length, bumper to bumper (mm)' });
const width = param('width', 1880, { min: 1650, max: 2000, description: 'body width without mirrors (mm)' });
const height = param('height', 1568, { min: 1350, max: 1750, description: 'overall height, ground to roof (mm)' });
const wheelbase = param('wheelbase', 2516, { min: 2300, max: 2900, description: 'front to rear axle (mm)' });
const rideHeight = param('rideHeight', 196, { min: 120, max: 260, description: 'sill height above ground (mm)' });

// Source dimensions the station tables were measured in.
const SRC_L = 4001;
const SRC_W = 1880;
const SRC_H = 1568;
const SRC_WB = 2516;
const SRC_RIDE = 196;
const SRC_FRONT_AXLE = 804;
const SRC_OVERHANGS = SRC_L - SRC_WB;
const WHEEL_R = 320;
const HALF_TRACK = 787;

type Num = Editable<number>;

// Source s (mm from the front bumper) -> model x. Overhangs follow
// (length - wheelbase), the span between the axles follows wheelbase.
function X(s: number): ParamRef<number> {
  const overhang = length.subtract(wheelbase);
  if (s <= SRC_FRONT_AXLE) return overhang.multiply(s / SRC_OVERHANGS);
  const frontAxle = overhang.multiply(SRC_FRONT_AXLE / SRC_OVERHANGS);
  if (s <= SRC_FRONT_AXLE + SRC_WB) return frontAxle.add(wheelbase.multiply((s - SRC_FRONT_AXLE) / SRC_WB));
  return frontAxle.add(wheelbase).add(overhang.multiply((s - SRC_FRONT_AXLE - SRC_WB) / SRC_OVERHANGS));
}
const Y = (w: number): ParamRef<number> => width.multiply(w / SRC_W);
const Z = (z: number): ParamRef<number> => rideHeight.add(height.subtract(rideHeight).multiply((z - SRC_RIDE) / (SRC_H - SRC_RIDE)));

// --- Station tables measured from the source mesh (mm) -----------------------
// Lower body: [s, zSill, zMaxWidth, wMax, zShoulder, wShoulder, zTop]
const LOWER: number[][] = [
  [0, 248, 500, 396, 554, 344, 615], // measured at s = 40; cap placed on the bumper face
  [150, 209, 440, 763, 739, 436, 809],
  [350, 200, 450, 904, 846, 724, 916],
  [600, 196, 540, 940, 942, 766, 1012],
  [800, 197, 560, 940, 1013, 770, 1083],
  [1000, 198, 560, 940, 1063, 785, 1088],
  [1300, 201, 560, 940, 1067, 796, 1092],
  [1900, 217, 550, 940, 1076, 807, 1101],
  [2600, 235, 550, 940, 1085, 813, 1110],
  [3150, 256, 560, 940, 1093, 810, 1118],
  [3450, 274, 560, 940, 1097, 799, 1122],
  [3650, 287, 570, 921, 1099, 784, 1124],
  [3780, 311, 600, 861, 1088, 640, 1113],
  [3880, 338, 616, 773, 812, 549, 864],
  [4001, 422, 578, 503, 598, 293, 655], // measured at s = 3960; cap on the bumper face
];
// Greenhouse: [s, zBelt, wBelt, wMidGlass, wRoofRail, zRoof]
const GREENHOUSE: number[][] = [
  [860, 1050, 600, 300, 295, 1109],
  [960, 1063, 730, 448, 307, 1152],
  [1150, 1065, 783, 697, 373, 1235],
  [1450, 1069, 800, 700, 425, 1366],
  [1900, 1076, 805, 675, 454, 1513],
  [2500, 1084, 812, 678, 454, 1566],
  [3050, 1091, 809, 684, 453, 1554],
  [3350, 1095, 805, 681, 408, 1535],
  [3550, 1098, 784, 684, 282, 1415],
  [3700, 1100, 766, 669, 304, 1283],
  [3790, 1078, 595, 381, 246, 1166],
];

// --- Sections and loft -------------------------------------------------------
// Closed, left/right-symmetric degree-3 NURBS section from right-half control
// points listed bottom -> roof centre. A flat floor line closes it.
function section(half: [number, number][]): Sketch {
  const pts: [Num, Num][] = half.map(([w, z]) => [Y(w), Z(z)]);
  for (let i = half.length - 2; i >= 0; i--) pts.push([Y(-half[i][0]), Z(half[i][1])]);
  const [w0, z0] = half[0];
  return path().moveTo(Y(-w0), Z(z0)).lineTo(Y(w0), Z(z0)).nurbsSegment(pts, { degree: 3 }).close();
}
function lowerSection(r: number[], grow = 0): Sketch {
  const [, zSill, zMax, wMax, zShoulder, wShoulder, zTop] = r;
  return section([
    [wMax - 70 + grow, zSill - grow],
    [wMax + grow, zSill + 25],
    [wMax + grow, zMax],
    [wMax - 12 + grow, (zMax + zShoulder) / 2],
    [wShoulder + grow, zShoulder],
    [wShoulder * 0.72 + grow, zTop + grow],
    [0, zTop + grow],
  ]);
}
function greenhouseSection(r: number[], grow = 0): Sketch {
  const [, zBelt, wBelt, wMid, wRail, zRoof] = r;
  return section([
    [wBelt + grow, zBelt - 60],
    [wBelt + grow, zBelt],
    [wMid + grow, zBelt + 0.55 * (zRoof - zBelt)],
    [wRail + 60 + grow, zRoof + grow],
    [0, zRoof + grow],
  ]);
}
// Loft through the rows in short runs that share their end sections, then
// fuse. Same surface as one long loft, but it meshes in seconds.
function loftStations(rows: number[][], make: (r: number[]) => Sketch, spans = 3): Shape {
  const pieces: Shape[] = [];
  for (let i = 0; i < rows.length - 1; i += spans) {
    const run = rows.slice(i, Math.min(i + spans + 1, rows.length));
    const sketches = run.map(make);
    pieces.push(sketches[0].loft(sketches.slice(1), {
      planes: run.map((r) => ({ plane: 'YZ' as const, origin: [X(r[0]), 0, 0] as [Num, Num, Num] })),
    }));
  }
  return pieces.length === 1 ? pieces[0] : pieces[0].union(...pieces.slice(1));
}
// Axis-aligned mask box in source coordinates (s along x, |w| across, z up).
function mask(s0: number, s1: number, halfW: number, z0: number, z1: number): Shape {
  const footprint: [Num, Num][] = [[X(s0), Y(-halfW)], [X(s1), Y(-halfW)], [X(s1), Y(halfW)], [X(s0), Y(halfW)]];
  return extrudePolygon(footprint, height.multiply((z1 - z0) / (SRC_H - SRC_RIDE))).translate(0, 0, Z(z0));
}

// --- Body --------------------------------------------------------------------
const PAINT = '#b3202a';
const AXLES = [SRC_FRONT_AXLE, SRC_FRONT_AXLE + SRC_WB];

// Wheel wells: a revolved tub (rounded inner lip) per corner, cut only
// through the outer flank, never a through-Y cut across the whole loft.
const ARCH_R = WHEEL_R + 45;
const archCut = (s: number, side: 1 | -1): Shape =>
  path().moveTo(0, 0).lineTo(ARCH_R, 0).lineTo(ARCH_R, 360).threePointsArc(ARCH_R - 60, 420, ARCH_R - 18, 402)
    .lineTo(0, 420).close()
    .revolve()
    .alongAxis([0, side, 0])
    .translate(X(s), Y(side * (HALF_TRACK - 200)), WHEEL_R);

// Lower intake: a dark rounded plate set 8 mm into the flat front cap.
const intakePlate = (depth: number): Shape =>
  extrudeRoundedRect(Z(480).subtract(Z(330)), Y(620), 60, depth).rotateY(90).translate(X(0), 0, Z(405));
const cabin = loftStations(GREENHOUSE, (r) => greenhouseSection(r));
const body = loftStations(LOWER, (r) => lowerSection(r))
  .subtract(...AXLES.flatMap((s) => [archCut(s, 1), archCut(s, -1)]))
  .union(cabin)
  .subtract(intakePlate(8))
  .color(PAINT);

// --- Glass: 4 mm skin (grown loft minus the cabin loft), masked to the windows -
const windowMask = mask(870, 3770, 1200, 1105, 1700).subtract(
  mask(1470, 3400, 520, 1105, 1700), // roof panel
  mask(2030, 2130, 1200, 1105, 1700), // B-pillar
  mask(3170, 3330, 1200, 1105, 1700), // C-pillar
  mask(870, 1130, 1200, 1105, 1700).subtract(mask(870, 1130, 640, 1105, 1700)), // A-pillar feet
);
const glass = loftStations(GREENHOUSE, (r) => greenhouseSection(r, 4))
  .subtract(cabin)
  .intersect(windowMask)
  .color('#16202a');

// --- Lamps and intake: 6 mm skins on the nose / tail, masked to each lamp ----
const skin = (rows: number[][]): Shape =>
  loftStations(rows, (r) => lowerSection(r, 6)).subtract(loftStations(rows, (r) => lowerSection(r)));
const noseSkin = skin(LOWER.slice(0, 4));
// Slices start on a run boundary of the body loft (rows 0 and 9), so the skin
// follows exactly the same surface as the body underneath it.
const tailSkin = skin(LOWER.slice(9)).subtract(cabin);
const outboard = (s0: number, s1: number, inner: number, z0: number, z1: number): Shape =>
  mask(s0, s1, 1100, z0, z1).subtract(mask(s0 - 10, s1 + 10, inner, z0 - 10, z1 + 10));
const headlamps = noseSkin.intersect(outboard(60, 430, 420, 640, 820)).color('#e8eef4');
const intake = intakePlate(8).color('#202226');
const taillamps = tailSkin.intersect(outboard(3700, 3970, 560, 760, 1110)).color('#c4141c');

// --- Mirrors and wheels (separate parts) -------------------------------------
const mirror = (side: 1 | -1): Shape =>
  sphere(1).scale([130, 100, 70]).translate(X(1520), Y(side * 960), Z(1030))
    .union(box(90, 120, 40, true).translate(X(1540), Y(side * 880), Z(1030)))
    .color(PAINT);
// Tyre Ø640 x 200 wide: revolved section with a rounded tread.
const tyre = (s: number, side: 1 | -1): Shape =>
  path().moveTo(205, -100).lineTo(285, -100).threePointsArc(285, 100, WHEEL_R, 0).lineTo(205, 100).close()
    .revolve()
    .rotateX(90)
    .translate(X(s), Y(side * HALF_TRACK), WHEEL_R)
    .color('#1b1b1d');
const rim = (s: number, side: 1 | -1): Shape =>
  cylinder(170, 200).translate(0, 0, -85)
    .union(cylinder(184, 60).translate(0, 0, -92))
    .rotateX(90)
    .translate(X(s), Y(side * HALF_TRACK), WHEEL_R)
    .color('#c9ccd1');

const car = assembly('compact hatchback (port of OSRF gazebo_models hatchback, CC-BY 3.0)');
car.part('body', body);
car.part('glass', glass);
car.part('headlamps', headlamps);
car.part('intake', intake);
car.part('taillamps', taillamps);
car.part('mirror-left', mirror(1));
car.part('mirror-right', mirror(-1));
const corners: [string, number, 1 | -1][] = [
  ['front-left', AXLES[0], 1], ['front-right', AXLES[0], -1],
  ['rear-left', AXLES[1], 1], ['rear-right', AXLES[1], -1],
];
for (const [name, s, side] of corners) {
  car.part(`tyre-${name}`, tyre(s, side));
  car.part(`rim-${name}`, rim(s, side));
}
return car.model();
