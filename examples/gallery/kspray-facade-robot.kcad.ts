// K-Spray façade coating robot — pitch concept for Summotive.
// Z-up, millimetres. The chassis and stabilizers are a low-speed, braked
// positioning base; this is a concept model, not a certified lifting device.
// K0 references: 210 mm wheel diameter; 165 mm deck; 164.9 x 124.3 mm screen.
//
// Seated kinematic build:
//   - no two parts share volume; a part that rides on another touches it on a
//     flat face or runs in a clearance bore or pocket
//   - every part is mated: the mast folds on a pinned hinge, the gun carriage
//     and the four outriggers slide, the gun wrist and the two service arms
//     turn on pins, and every other part is fastened to the part that carries
//     it at a seat on the face the two parts share
//   - the pose params drive the mates, not part transforms

const mastFoldAngle = param('mastFoldAngle', 0, {
  min: 0, max: 90, description: 'Hinge angle: 0 = upright, 90 = folded back for transport.',
});
const carriageHeight = param('carriageHeight', 2.25, {
  min: 0.4, max: 2.7, description: 'Gun carriage height above the mast foot (m).',
});
const outriggerDeploy = param('outriggerDeploy', 1, {
  min: 0, max: 1,
  description: 'Outrigger deployment: 0 = tucked for travel, 1 = full 1.94 m stance.',
});
const armReach = param('armReach', 1, {
  min: 0.65, max: 1.15,
  description: 'SO-101-inspired arm link length scale; nominal reach about 240 mm.',
});
const armYawDeg = param('armYawDeg', 18, {
  min: -10, max: 55, description: 'Shoulder yaw of both service arms, positive = outward (degrees).',
});
const armPitchDeg = param('armPitchDeg', -14, {
  min: -35, max: 20, description: 'Upper arm pitch of both service arms, positive = up (degrees).',
});
const wristTiltDeg = param('wristTiltDeg', -8, {
  min: -30, max: 30, description: 'Single spray-gun wrist tilt, positive = nozzle up (degrees).',
});

const C = {
  frame: '#27343d', dark: '#18232a', orange: '#f0782f', amber: '#f6b23b',
  gunBlue: '#1769aa', gunSilver: '#c5cdd1',
  ivory: '#e8e4d9', alu: '#aeb8bd', black: '#15191c', rubber: '#202326',
  red: '#d7222b', blue: '#315c72', glass: '#78aab5',
} as const;
type Hex = `#${string}`;
type Vec3 = [number, number, number];
type Solid = ReturnType<typeof box>;

// ---- layout constants -----------------------------------------------------
const DECK_TOP = 172;          // chassis deck top
const WHEEL_R = 105;           // 210 mm wheel
const WHEEL_X = 310;
const WHEEL_Y = 436;           // casters stand outboard of the chassis sides
const OUT_Y = 250;             // outrigger beam centreline
const OUT_Z = 78;
const OUT_POCKET_X0 = 30;      // pocket inner end wall
const OUT_STROKE = 300;
const OUT_FIT = 0.3;           // running clearance per side in the pocket
const HINGE: Vec3 = [-20, 0, 310];   // mast hinge pin axis (along Y)
const HINGE_HUB_R = 14.7;
const HINGE_BORE_R = 15;
const MAST_TOP = 3000;         // mast frame: origin on the hinge axis, +Z up the mast
const MAST_FOOT = 20;          // mast foot face; the carriage height datum
const MAST_HALF_Y = 45;        // the carriage cheeks bear on the mast sides
const HEAD_PLATE_Z0 = 3036;
const HEAD_PLATE_Z1 = 3048;
const SHOULDER_X = 45;         // service-arm yaw axis, in the mast frame
const SHOULDER_Y = 84;
const YAW_Z = 2988;
const YAW_HUB_R = 7.7;
const YAW_BORE_R = 8;
const PITCH_X = 44;            // pitch pin, in the turret frame
const PITCH_HUB_R = 6.7;
const PITCH_BORE_R = 7;
const WRIST_X = 128;           // gun wrist pin, in the carriage frame
const WRIST_HUB_R = 7.7;
const WRIST_BORE_R = 8;

setCameraTarget(0, 0, 1750);

// ---- shape helpers (all centred on the given point) -------------------------
function zCylinder(h: number, r: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).translate(x, y, z - h / 2).color(color);
}
function yCylinder(h: number, r: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).alongAxis([0, 1, 0]).translate(x, y - h / 2, z).color(color);
}
function xCylinder(h: number, r: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).alongAxis([1, 0, 0]).translate(x - h / 2, y, z).color(color);
}
// A ring: a cylinder with a drilled clearance bore for the pin it turns on.
function yRing(h: number, r: number, boreR: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).hole('top', { u: 0, v: 0, diameter: boreR * 2, depth: 'through' })
    .alongAxis([0, 1, 0]).translate(x, y - h / 2, z).color(color);
}
function zRing(h: number, r: number, boreR: number, x: number, y: number, z: number, color: Hex) {
  return cylinder(h, r, 40).hole('top', { u: 0, v: 0, diameter: boreR * 2, depth: 'through' })
    .translate(x, y, z - h / 2).color(color);
}
function block(x: number, y: number, z: number, cx: number, cy: number, cz: number, color: Hex) {
  return box(x, y, z, true).translate(cx, cy, cz).color(color);
}

const robot = assembly('K-Spray façade coating robot concept');
type Part = ReturnType<typeof robot.part>;

// A fastened mate joins two frame connectors at one seat point. `seat` is in
// the parent's frame; `childSeat` is the same point in the child's frame when
// the two frames differ.
function fasten(child: Part, parent: Part, seat: Vec3, childSeat: Vec3 = seat) {
  parent.connector(`${child.name}-seat`, { type: 'frame', origin: { kind: 'vec3', value: seat } });
  child.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: childSeat } });
  robot.mate(`${child.name}-fastened`, `${parent.name}.${child.name}-seat`, `${child.name}.seat`, 'fastened');
}
function axisConnector(origin: Vec3, axis: Vec3, jointClearanceRadius?: number) {
  return {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: origin },
    axis,
    ...(jointClearanceRadius === undefined ? {} : { jointClearanceRadius }),
  };
}

// ===========================================================================
// BASE — world frame. Welded chassis with a recessed deck, side bumper rails
// and four outrigger pockets open at the chassis ends.
// ===========================================================================
let chassisGeom: Solid = block(920, 700, 115, 0, 0, 100, C.frame)
  .union(block(870, 650, 22, 0, 0, DECK_TOP - 11, C.alu))
  .union(block(790, 24, 46, 0, -354, 90, C.dark))
  .union(block(790, 24, 46, 0, 354, 90, C.dark));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  // 1 mm run-out through the chassis end face
  const depth = 460 - OUT_POCKET_X0 + 1;
  chassisGeom = chassisGeom.subtract(
    box(depth, 82 + 2 * OUT_FIT, 58 + 2 * OUT_FIT, true)
      .translate(sx * (OUT_POCKET_X0 + depth / 2), sy * OUT_Y, OUT_Z),
  );
}
const chassis = robot.part('welded-chassis-frame-and-perimeter-bumpers', chassisGeom);

// Four braked casters. The fork stands on the deck edge and carries the wheel
// outboard of the chassis on an axle in a clearance bore.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * WHEEL_X;
  const y = sy * WHEEL_Y;
  const corner = `${sx > 0 ? 'right' : 'left'}-${sy > 0 ? 'rear' : 'front'}`;
  const fork = robot.part(`caster-fork-brake-${corner}`,
    block(115, 212, 24, x, sy * 396, 228, C.alu)                       // top plate
      .union(block(80, 35, 45, x, sy * 307.5, DECK_TOP + 22.5, C.alu))   // riser on the deck
      .union(block(60, 16, 132, x, y - 56, 151, C.frame))                // cheeks
      .union(block(60, 16, 132, x, y + 56, 151, C.frame))
      .union(yCylinder(128, 12, x, y, WHEEL_R, C.dark))                  // axle
      .union(zCylinder(31, 26, x, sy * 396, 254.5, C.dark))              // swivel boss
      .union(block(48, 22, 15, x + sx * 30, sy * 470, 246.5, C.red)));   // brake tab
  fasten(fork, chassis, [x, sy * 307.5, DECK_TOP]);
  const wheel = robot.part(`wheel-${corner}-pneumatic-210mm-hub`,
    yRing(88, WHEEL_R, 12.3, x, y, WHEEL_R, C.rubber)
      .union(yRing(92, 51, 12.3, x, y, WHEEL_R, C.dark)));
  // seat: the lowest point of the axle, inside the hub bore
  fasten(wheel, fork, [x, y, WHEEL_R - 12]);
}

// Battery/control enclosure on the forward deck: lid, side panels, louvers,
// latch, and the base E-stop on the lid.
let controlGeom: Solid = block(315, 255, 310, 205, 0, DECK_TOP + 155, C.blue)
  .union(block(300, 240, 24, 205, 0, 492, C.alu))
  .union(block(276, 8, 92, 205, -130, 342, C.dark))
  .union(block(276, 8, 92, 205, 130, 342, C.dark));
for (let i = 0; i < 6; i++) {
  controlGeom = controlGeom.union(block(210, 3, 5, 205, -135, 310 + i * 12, C.alu));
}
controlGeom = controlGeom.union(block(54, 22, 16, 335, -65, 508, C.dark));
const control = robot.part('sealed-battery-and-control-enclosure-with-vents-latch', controlGeom);
fasten(control, chassis, [205, 0, DECK_TOP]);
const baseStop = robot.part('base-emergency-stop-mushroom',
  zCylinder(30, 24, 205, 0, 540, C.red)
    .union(zCylinder(22, 29, 205, 0, 515, C.dark))
    .union(zCylinder(8, 28, 205, 0, 558, C.red)));
fasten(baseStop, control, [205, 0, 504]);

// Hinge yoke: base plate on the deck, two cheeks and the hinge pin. The mast
// foot turns between the cheeks with 8 mm side clearance.
const yoke = robot.part('base-hinge-yoke-and-bearing-pin',
  block(120, 170, 28, HINGE[0], 0, DECK_TOP + 14, C.frame)
    .union(block(70, 20, 141, HINGE[0], -75, 269.5, C.frame))
    .union(block(70, 20, 141, HINGE[0], 75, 269.5, C.frame))
    .union(yCylinder(190, HINGE_HUB_R, HINGE[0], 0, HINGE[2], C.orange)));
fasten(yoke, chassis, [HINGE[0], 0, DECK_TOP]);
yoke.connector('hinge', axisConnector(HINGE, [0, -1, 0], HINGE_HUB_R));
const stepper = robot.part('braked-stepper-with-reduction-gearbox',
  block(110, 110, 104, HINGE[0], -145, DECK_TOP + 52, C.dark));
fasten(stepper, chassis, [HINGE[0], -145, DECK_TOP]);
const lockPin = robot.part('hinge-stop-and-lock-pin', yCylinder(24, 10, 5, 97, 250, C.red));
fasten(lockPin, yoke, [5, 85, 250]);

// Pump connection on the chassis front face.
const hosePort = robot.part('airless-pump-hose-stub-and-quick-coupling',
  xCylinder(46, 22, 483, -125, 118, C.alu)
    .union(xCylinder(28.5, 17, 519.75, -125, 118, C.orange))
    .union(xCylinder(24.5, 12, 545.75, -125, 118, C.dark)));
fasten(hosePort, chassis, [460, -125, 118]);

// Outriggers: each beam slides in its chassis pocket and carries the jack
// column and the rubber pad. Beam frame: origin at the beam's inner end face.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const corner = `${sx > 0 ? 'right' : 'left'}-${sy > 0 ? 'rear' : 'front'}`;
  const beam = robot.part(`stabilizer-jack-pad-${corner}`,
    block(700, 82, 58, sx * 350, 0, 0, C.orange)
      .union(zCylinder(132, 25, sx * 640, 0, 6, C.dark))
      .union(block(165, 145, 26, sx * 640, 0, -65, C.rubber))
      .union(block(134, 115, 8, sx * 640, 0, -48, C.alu)));
  chassis.connector(`outrigger-${corner}`,
    axisConnector([sx * OUT_POCKET_X0, sy * OUT_Y, OUT_Z], [sx, 0, 0]));
  beam.connector('slide', axisConnector([0, 0, 0], [sx, 0, 0]));
  robot.mate(`outrigger-${corner}-slide`, `${chassis.name}.outrigger-${corner}`, `${beam.name}.slide`, 'prismatic', {
    pose: outriggerDeploy.multiply(OUT_STROKE),
    limitsMm: [0, OUT_STROKE],
  });
}

// ===========================================================================
// MAST — mast frame: origin on the hinge axis, +Z up the mast, +X toward the
// façade. 40-series extrusion with a collar in a clearance bore on the pin.
// ===========================================================================
const mast = robot.part('series40-aluminium-extrusion-rail',
  block(80, 90, MAST_TOP - MAST_FOOT, 0, 0, (MAST_TOP + MAST_FOOT) / 2, C.alu)
    .union(yRing(110, 32, HINGE_BORE_R, 0, 0, 0, C.alu)));
mast.connector('hinge', axisConnector([0, 0, 0], [0, -1, 0], HINGE_BORE_R));
mast.connector('rail', axisConnector([0, 0, MAST_FOOT], [0, 0, 1]));
robot.mate('mast-fold-hinge', `${yoke.name}.hinge`, `${mast.name}.hinge`, 'revolute', {
  pose: mastFoldAngle,
  limitsDeg: [0, 90],
});

// Clamp sleeve around the mast foot.
const footSleeve = robot.part('mast-foot-clamp-sleeve',
  block(104, 114, 70, 0, 0, 75, C.orange).subtract(block(80, 90, 72, 0, 0, 75, C.orange)));
fasten(footSleeve, mast, [40, 0, 75]);

// Timing belt and its cover on the front face; the carriage plate runs clear
// of both.
const belt = robot.part('mast-3m-timing-belt', block(8, 13, 2820, 44, -34, 1530, C.black));
fasten(belt, mast, [40, -34, 1530]);
const beltCover = robot.part('belt-cover-and-return-track', block(9, 20, 2820, 44.5, -8, 1530, C.dark));
fasten(beltCover, mast, [40, -8, 1530]);

// Drag-chain channel with twelve hose clips on the back face, behind the
// carriage, and an amber latch on each clip.
let chainGeom: Solid = block(34, 60, 2800, -57, 0, 1520, C.dark);
const clipStations: number[] = [];
for (let i = 0; i < 12; i++) clipStations.push(220 + i * 235);
for (const along of clipStations) chainGeom = chainGeom.union(block(16, 70, 20, -81, 0, along, C.dark));
const chain = robot.part('drag-chain-channel-and-hose-clips', chainGeom);
fasten(chain, mast, [-40, 0, 1520]);
clipStations.forEach((along, i) => {
  const latch = robot.part(`mast-hose-clip-latch-${i + 1}`, block(10, 16, 26, -94, -27, along, C.amber));
  fasten(latch, chain, [-89, -27, along]);
});

// ---- K0 head on the mast top ----------------------------------------------
const riser = robot.part('mast-end-riser-and-bolted-K0-head-plate',
  block(86, 92, 40, 0, 0, MAST_TOP + 20, C.alu)
    .union(block(160, 220, HEAD_PLATE_Z1 - HEAD_PLATE_Z0, 0, 0, (HEAD_PLATE_Z0 + HEAD_PLATE_Z1) / 2, C.dark)));
fasten(riser, mast, [0, 0, MAST_TOP]);
// Head shell 142 x 205 x 158: X = -71..71, Y = -102.5..102.5.
const HEAD_Z = HEAD_PLATE_Z1 + 79;
const head = robot.part('K0-head-shell', block(142, 205, 158, 0, 0, HEAD_Z, C.ivory));
fasten(head, riser, [0, 0, HEAD_PLATE_Z1]);
const display = robot.part('K0-head-display',
  block(12, 166, 124.3, -77, 0, HEAD_Z, C.dark).union(block(3, 150, 108, -84, 0, HEAD_Z, C.glass)));
fasten(display, head, [-71, 0, HEAD_Z]);
// The stereo bar is on the head face toward the façade (+X).
const CAMERA_Z = HEAD_Z - 12;
const stereoBar = robot.part('bolted-stereo-depth-camera-bar-on-head-front', block(26, 128, 34, 84, 0, CAMERA_Z, C.dark));
fasten(stereoBar, head, [71, 0, CAMERA_Z]);
for (const side of [-1, 1]) {
  const cy = side * 40;
  const camera = robot.part(`stereo-camera-${side < 0 ? 'left' : 'right'}-bolted-to-front-bar`,
    block(36, 32, 32, 115, cy, CAMERA_Z, C.black)
      .union(block(8, 20, 20, 136.5, cy, CAMERA_Z, C.glass)));
  fasten(camera, stereoBar, [97, cy, CAMERA_Z]);
}
const HEAD_TOP = HEAD_Z + 79;
const topCamera = robot.part('head-top-inspection-camera',
  block(34, 30, 22, -30, 0, HEAD_TOP + 11, C.dark).union(block(20, 19, 3, -30, 0, HEAD_TOP + 23, C.glass)));
fasten(topCamera, head, [-30, 0, HEAD_TOP]);
const headStop = robot.part('head-emergency-stop-mushroom',
  zCylinder(20, 13, 35, 0, HEAD_TOP + 21, C.red).union(zCylinder(12, 16, 35, 0, HEAD_TOP + 6, C.dark)));
fasten(headStop, head, [35, 0, HEAD_TOP]);

// ---- two SO-101-inspired service arms under the head plate -----------------
// Shoulder servo with a vertical yaw pin, a turret on the pin with a pitch
// pin, and the upper link, elbow servo, fore link and wrist servo as one
// rigid chain on the pitch pin. Both arms follow the same two params; the
// left yaw axis is reversed so the arms mirror.
const reach = Number(armReach);
const l1 = 76 * reach;
const l2 = 62 * reach;
for (const side of [-1, 1]) {
  const label = side < 0 ? 'left' : 'right';
  const y = side * SHOULDER_Y;
  const yawAxis: Vec3 = [0, 0, side];
  const shoulder = robot.part(`SO101-${label}-shoulder-servo-bolted-to-plate`,
    block(44, 44, 30, SHOULDER_X, y, HEAD_PLATE_Z0 - 15, C.dark)
      .union(zCylinder(36.5, YAW_HUB_R, SHOULDER_X, y, 2988.25, C.dark))
      .union(zCylinder(4.5, 13, SHOULDER_X, y, 2968.25, C.dark)));
  fasten(shoulder, riser, [SHOULDER_X, y, HEAD_PLATE_Z0]);
  shoulder.connector('yaw', axisConnector([SHOULDER_X, y, YAW_Z], yawAxis, YAW_HUB_R));

  // Turret frame: origin on the yaw axis, +X along the arm.
  const turret = robot.part(`SO101-${label}-shoulder-turret`,
    zRing(14, 18, YAW_BORE_R, 0, 0, 0, C.orange)
      .union(block(14, 40, 14, 17, 0, 0, C.orange))
      .union(block(30, 6, 14, 37, -17, 0, C.orange))
      .union(block(30, 6, 14, 37, 17, 0, C.orange))
      .union(yCylinder(40, PITCH_HUB_R, PITCH_X, 0, 0, C.orange)));
  turret.connector('yaw', axisConnector([0, 0, 0], yawAxis, YAW_BORE_R));
  turret.connector('pitch', axisConnector([PITCH_X, 0, 0], [0, -1, 0], PITCH_HUB_R));
  robot.mate(`SO101-${label}-shoulder-yaw`, `${shoulder.name}.yaw`, `${turret.name}.yaw`, 'revolute', {
    pose: armYawDeg,
    limitsDeg: [-10, 55],
  });

  // Link frame: origin on the pitch axis, +X along the arm.
  const upper = robot.part(`SO101-${label}-upper-link`,
    block(l1 - 8, 22, 22, (l1 + 8) / 2, 0, 0, C.ivory)
      .union(yRing(22, 13, PITCH_BORE_R, 0, 0, 0, C.ivory)));
  upper.connector('pitch', axisConnector([0, 0, 0], [0, -1, 0], PITCH_BORE_R));
  robot.mate(`SO101-${label}-shoulder-pitch`, `${turret.name}.pitch`, `${upper.name}.pitch`, 'revolute', {
    pose: armPitchDeg,
    limitsDeg: [-35, 20],
  });
  const elbow = robot.part(`SO101-${label}-elbow-servo`, block(30, 30, 30, l1 + 15, 0, 0, C.dark));
  fasten(elbow, upper, [l1, 0, 0]);
  const fore = robot.part(`SO101-${label}-fore-link`, block(l2, 20, 20, l1 + 30 + l2 / 2, 0, 0, C.ivory));
  fasten(fore, elbow, [l1 + 30, 0, 0]);
  const wrist = robot.part(`SO101-${label}-wrist-tool-servo`, block(26, 26, 26, l1 + 30 + l2 + 13, 0, 0, C.dark));
  fasten(wrist, fore, [l1 + 30 + l2, 0, 0]);
}

// ===========================================================================
// CARRIAGE — carriage frame: origin on the mast axis at the carriage centre.
// A C-channel whose cheeks bear on the mast sides; the plate runs in front of
// the belt. The gun turns on a single wrist pin.
// ===========================================================================
const carriage = robot.part('belt-driven-carriage',
  block(105, 20, 122, 22.5, -(MAST_HALF_Y + 10), 0, C.dark)
    .union(block(105, 20, 122, 22.5, MAST_HALF_Y + 10, 0, C.dark))
    .union(block(20, 130, 122, 65, 0, 0, C.dark)));
// The slide axis runs up the centre of the open channel: the mast fills the
// channel, so the declared clearance is the mast half-width to the cheeks.
carriage.connector('slide', axisConnector([0, 0, 0], [0, 0, 1], MAST_HALF_Y));
robot.mate('carriage-slide', `${mast.name}.rail`, `${carriage.name}.slide`, 'prismatic', {
  pose: carriageHeight.multiply(1000),
  limitsMm: [400, 2700],
});
const carriagePlate = robot.part('carriage-front-plate', block(8, 100, 86, 79, 0, 0, C.orange));
fasten(carriagePlate, carriage, [75, 0, 0]);
const gunMount = robot.part('carriage-wrist-pin-and-gun-mount',
  block(12, 70, 60, 89, 0, 0, C.alu)
    .union(block(48, 8, 24, 118, -28, 0, C.alu))
    .union(block(48, 8, 24, 118, 28, 0, C.alu))
    .union(yCylinder(64, WRIST_HUB_R, WRIST_X, 0, 0, C.dark)));
fasten(gunMount, carriagePlate, [83, 0, 0]);
gunMount.connector('wrist', axisConnector([WRIST_X, 0, 0], [0, -1, 0], WRIST_HUB_R));

// Graco AL-5-style light gun. Gun frame: origin on the wrist axis, nozzle
// along +X toward the façade.
const gun = robot.part('recognisable-airless-gun-body-grip-barrel-tip-guard',
  block(110, 40, 42, 65, 0, 0, C.gunBlue)
    .union(yRing(36, 16, WRIST_BORE_R, 0, 0, 0, C.gunBlue))
    .union(block(34, 30, 78, 50, 0, -56, C.gunBlue))
    .union(block(61, 24, 22, 150, 0, 0, C.gunSilver))
    .union(block(30.5, 16, 16, 195, 0, 0, C.dark))
    .union(block(10, 58, 62, 214, 0, 0, C.gunBlue)));
gun.connector('wrist', axisConnector([0, 0, 0], [0, -1, 0], WRIST_BORE_R));
robot.mate('gun-wrist-tilt', `${gunMount.name}.wrist`, `${gun.name}.wrist`, 'revolute', {
  pose: wristTiltDeg,
  limitsDeg: [-30, 30],
});
// Laser/depth standoff unit on the gun body, looking along the spray axis.
const standoff = robot.part('laser-depth-standoff-sensor-on-gun-body',
  block(46, 34, 30, 83, 0, 36, C.dark).union(block(4, 22, 20, 107, 0, 36, C.glass)));
fasten(standoff, gun, [83, 0, 21]);

return robot.model();
