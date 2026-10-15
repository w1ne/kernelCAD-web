// K-Spray façade coating robot — pitch concept for Summotive.
// Z-up, millimetres. The chassis and stabilizers are a low-speed, braked
// positioning base; this is a concept model, not a certified lifting device.
// K0 references: 210 mm wheel diameter; 165 mm deck; 164.9 x 124.3 mm screen.

const mastFoldAngle = param('mastFoldAngle', 0, {
  min: 0, max: 90, description: 'Hinge angle: 0 = upright, 90 = folded for transport.',
});
const carriageHeight = param('carriageHeight', 2.25, {
  min: 0.2, max: 3, description: 'Gun carriage height above hinge (m).',
});
const outriggerDeploy = param('outriggerDeploy', 1, {
  min: 0, max: 1,
  description: 'Outrigger deployment: 0 = tucked for travel, 1 = full stance.',
});
const armReach = param('armReach', 1, {
  min: 0.65, max: 1.15,
  description: 'SO-101-inspired arm extension scale; nominal reach about 440 mm.',
});
const armYawDeg = param('armYawDeg', -18, {
  min: -55, max: 55, description: 'Shoulder yaw pose (degrees).',
});
const armPitchDeg = param('armPitchDeg', -14, {
  min: -35, max: 35, description: 'Upper arm pitch pose (degrees).',
});

const C = {
  frame: '#27343d', dark: '#18232a', orange: '#f0782f', amber: '#f6b23b',
  gunBlue: '#1769aa', gunSilver: '#c5cdd1',
  ivory: '#e8e4d9', alu: '#aeb8bd', black: '#15191c', rubber: '#202326',
  red: '#d7222b', blue: '#315c72', glass: '#78aab5', hose: '#282d31',
};
const deckZ = 165;
const wheelD = 210;
const baseL = 920;
const baseW = 700;
const mastX = -20;
const mastZ0 = deckZ;
const mastLength = 3000;
const foldDeg = mastFoldAngle.value ?? 0;
const foldRad = foldDeg * Math.PI / 180;
const carriageAlong = (carriageHeight.value ?? 2.25) * 1000;
const headWidth = 205;
const headHeight = 158;
const armScale = armReach;

setCameraTarget(0, 0, 1750);

function zCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).translate(x, y, z).color(color);
}
function yCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).alongAxis([0, 1, 0]).translate(x, y, z).color(color);
}
function roundedBox(x: number, y: number, z: number, r: number, cx: number, cy: number, cz: number, color: string) {
  return box(x, y, z, true).translate(cx, cy, cz).color(color);
}

const robot = assembly('K-Spray façade coating robot concept');

// Low-profile welded chassis with rounded bumper rails and recessed deck.
const chassis = roundedBox(baseL, baseW, 115, 24, 0, 0, 100, C.frame)
  .union(roundedBox(baseL - 50, baseW - 50, 22, 5, 0, 0, 161, C.alu))
  .union(roundedBox(790, 36, 46, 8, 0, -baseW / 2 + 18, 90, C.dark))
  .union(roundedBox(790, 36, 46, 8, 0, baseW / 2 - 18, 90, C.dark));
robot.part('welded-chassis-frame-and-perimeter-bumpers', chassis);

// Four pneumatic/caster wheels, swivel forks, visible hubs and mechanical brakes.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * 310;
  const y = sy * 365;
  const wheel = yCylinder(88, wheelD / 2, x, y - 44, 105, C.rubber)
    .union(yCylinder(92, 51, x, y - 46, 105, C.dark))
    .union(yCylinder(94, 34, x, y - 47, 105, C.alu))
    .union(yCylinder(98, 12, x, y - 49, 105, C.orange));
  robot.part(`wheel-${sx > 0 ? 'right' : 'left'}-${sy > 0 ? 'rear' : 'front'}-pneumatic-210mm-hub`, wheel);
  const fork = roundedBox(115, 138, 24, 8, x, y, 214, C.alu)
    .union(zCylinder(78, 26, x, y, 223, C.dark))
    .union(roundedBox(16, 75, 54, 5, x, y - 31, 175, C.frame))
    .union(roundedBox(16, 75, 54, 5, x, y + 31, 175, C.frame))
    .union(roundedBox(48, 22, 15, 5, x + sx * 45, y - sy * 32, 228, C.red));
  robot.part(`caster-fork-brake-${sx}_${sy}`, fork);
}

// Battery/control enclosure on forward deck: removable lid, louvers, latch and E-stop.
const control = roundedBox(315, 255, 310, 22, 205, 0, 335, C.blue)
  .union(roundedBox(300, 240, 24, 8, 205, 0, 501, C.alu))
  .union(roundedBox(276, 8, 92, 2, 205, -130, 350, C.dark))
  .union(roundedBox(276, 8, 92, 2, 205, 130, 350, C.dark));
let vents = control;
for (let i = 0; i < 6; i++) {
  vents = vents.union(roundedBox(210, 3, 5, 1, 205, -135, 318 + i * 12, C.alu));
}
vents = vents.union(roundedBox(54, 22, 16, 3, 335, -65, 504, C.dark));
robot.part('sealed-battery-and-control-enclosure-with-vents-latch-and-E-stop', vents);
robot.part('base-emergency-stop-mushroom', zCylinder(22, 29, 205, 0, 500, C.dark)
  .union(zCylinder(30, 24, 205, 0, 520, C.red))
  .union(zCylinder(8, 28, 205, 0, 544, '#f2433c')));

// Hinged 3 m 40-series extrusion with belt, end pulley and base stepper brake.
const hingeX = mastX, hingeZ = mastZ0 + 68;
function placeOnMast<T extends ReturnType<typeof box>>(
  name: string,
  localShape: T,
  along: number,
  localX = 0,
  localY = 0,
) {
  // Every local shape is centred about its mount coordinates. Rotate once
  // about its local origin, then apply the mast station and base hinge offset.
  const rotated = localShape.rotate([0, 1, 0], -foldDeg);
  const world = rotated.translate(
    mastX + along * Math.sin(foldRad) + localX * Math.cos(foldRad),
    localY,
    mastZ0 + along * Math.cos(foldRad) - localX * Math.sin(foldRad),
  );
  robot.part(name, world);
}
placeOnMast('series40-aluminium-extrusion-rail', box(80, 90, mastLength, true), mastLength / 2);
placeOnMast('belt-cover-and-return-track', box(9, 20, mastLength - 100, true).translate(46, 0, 0), mastLength / 2, 0, -8);
placeOnMast('linear-axis-hinged-head-yoke', box(190, 172, 70, true).color(C.orange), 45);
robot.part('base-hinge-yoke-and-bearing-pins', roundedBox(185, 200, 110, 12, hingeX, 0, hingeZ, C.frame)
  .union(yCylinder(210, 48, hingeX, -105, hingeZ, C.dark))
  .union(yCylinder(212, 34, hingeX, -106, hingeZ, C.orange)));
robot.part('braked-stepper-with-reduction-gearbox', roundedBox(110, 110, 104, 8, mastX - 90, -90, mastZ0 + 55, C.dark)
  .union(yCylinder(30, 39, mastX - 35, -112, mastZ0 + 55, C.alu)));
placeOnMast('mast-3m-timing-belt-and-top-idler',
  box(8, 13, mastLength - 120, true).color(C.black), mastLength / 2, 43, -34);
robot.part('hinge-stop-and-lock-pin', yCylinder(94, 13, hingeX + 45, -47, hingeZ, C.red));
// Carriage rises on four guide rollers and carries a single tilt joint gun bracket.
const carriage = roundedBox(164, 156, 122, 12, 0, 0, 0, C.dark)
  .union(roundedBox(132, 20, 86, 6, 70, 0, 0, C.orange))
  .union(roundedBox(44, 24, 48, 6, 122, 0, -48, C.alu))
  .union(roundedBox(90, 20, 86, 6, 160, 0, -48, C.alu));
placeOnMast('belt-driven-carriage-and-single-axis-gun-wrist', carriage, carriageAlong);

// Outriggers extend to a 1.95 m stance and land on swiveling rubber pads.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const bx = sx * 340;
  const by = sy * 250;
  const deployment = outriggerDeploy.value ?? 1;
  const extension = deployment * 625;
  const legLen = 230 + extension;
  const jackX = bx + sx * 600;
  const startX = sx < 0 ? bx - extension / 2 : bx + extension / 2;
  const beam = box(legLen, 82, 58, true).translate(
    startX, by, 78,
  ).color(C.orange)
    .union(box(legLen - 28, 24, 18, true).translate(
      startX, by, 110,
    ).color(C.alu))
    .union(zCylinder(150, 25, jackX, by, 0, C.dark))
    .union(roundedBox(165, 145, 26, 8, jackX, by, 14, C.rubber))
    .union(roundedBox(134, 115, 8, 15, jackX, by, 29, C.alu));
  robot.part(`stabilizer-jack-pad-${sx}_${sy}`, beam);
}

// Pump connection and deliberately visible, clipped pressure hose down the mast.
const hosePort = yCylinder(46, 22, 410, -125, 118, C.alu)
  .union(yCylinder(28, 17, 410, -148, 118, C.orange))
  .union(yCylinder(24, 12, 410, -164, 118, C.dark));
robot.part('airless-pump-hose-stub-and-quick-coupling', hosePort);
const hoseClips = roundedBox(110, 26, 20, 5, mastX + 10, -82, mastZ0 + 220, C.dark);
robot.part('lower-hose-strain-relief-clamp', hoseClips);
for (let i = 0; i < 12; i++) {
  const along = 220 + i * 235;
  const x = mastX + along * Math.sin(foldRad), z = mastZ0 + along * Math.cos(foldRad);
  robot.part(`mast-hose-clip-${i + 1}`, roundedBox(110, 26, 20, 5, x + 10, -82, z, C.dark));
  robot.part(`mast-hose-clip-latch-${i + 1}`, roundedBox(18, 16, 26, 4, x + 28, -100, z, C.amber));
}
// Flexible service bundle rides in a dark drag-chain channel beside the extrusion.
const chainLen = Math.max(400, carriageAlong);
placeOnMast('drag-chain-channel', box(72, 34, chainLen, true).color(C.dark), chainLen / 2, -67, -92);
placeOnMast('carriage-hose-strain-relief-loop', roundedBox(175, 22, 22, 8, -85, -85, 0, C.hose), carriageAlong, 0, 0);

// K0/K1 top subassembly. All pieces below are authored in a single head-local
// frame and receive one shared mast placement at the mast-top mount.
const headAlong = mastLength + 125;
const headLocal = roundedBox(142, headWidth, headHeight, 24, 0, 0, 0, C.ivory)
  .union(roundedBox(12, 166, 124.3, 8, -77, 0, 2, C.dark))
  .union(roundedBox(5, 150, 108, 4, -85, 0, 2, C.glass));
placeOnMast('K0-head-shell-and-display', headLocal, headAlong);
// Head bounds are X=-71..71, Y=-102.5..102.5, Z=-79..79.
// This face is toward the façade (+X); the 26 mm bar overlaps the shell by 1 mm.
const stereoBar = roundedBox(26, 128, 34, 6, 83, 0, -12, C.dark)
  .union(roundedBox(4, 148, 10, 2, 70, 0, -12, C.alu));
placeOnMast('bolted-stereo-depth-camera-bar-overlapping-head-front', stereoBar, headAlong);
for (const side of [-1, 1]) {
  const cy = side * 40;
  const camera = roundedBox(36, 32, 32, 5, 100, cy, -12, C.dark)
    .union(roundedBox(8, 20, 20, 4, 121, cy, -12, C.black))
    .union(roundedBox(3, 14, 14, 2, 126, cy, -12, C.glass));
  placeOnMast(`stereo-camera-${side < 0 ? 'left' : 'right'}-bolted-to-front-bar`, camera, headAlong);
}
placeOnMast('head-top-inspection-camera', roundedBox(34, 30, 22, 5, 10, 0, 88, C.dark)
  .union(roundedBox(20, 19, 3, 2, 10, 0, 100, C.glass)), headAlong);
placeOnMast('head-emergency-stop-mushroom', zCylinder(12, 16, 25, 0, 72, C.dark)
  .union(zCylinder(20, 13, 25, 0, 82, C.red)), headAlong);
const topYoke = roundedBox(86, 92, 118, 10, 0, 0, 66, C.alu)
  .union(roundedBox(120, 176, 30, 7, 0, 0, 64, C.dark))
  .union(yCylinder(190, 13, 0, -95, 64, C.orange));
placeOnMast('mast-end-riser-and-bolted-K0-head-plate', topYoke, headAlong);

// Compact SO-101-inspired two-link service arm fixed to the head-local yoke.
const armYaw = (armYawDeg.value ?? -18) * Math.PI / 180;
const armPitch = (armPitchDeg.value ?? -14) * Math.PI / 180;
const l1 = 76 * (armScale.value ?? 1), l2 = 62 * (armScale.value ?? 1);
function link(a: [number, number, number], b: [number, number, number], color: string, thick: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const tilt = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy)) * 180 / Math.PI;
  const yawD = Math.atan2(dy, dx) * 180 / Math.PI;
  return roundedBox(len + 24, thick, thick, 8, 0, 0, 0, color)
    .rotate([0, 1, 0], -tilt).rotate([0, 0, 1], yawD)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
const headArmPart = (name: string, shape: ReturnType<typeof box>, at: [number, number, number]) =>
  placeOnMast(name, shape.translate(at[0], at[1], at[2]), headAlong);
// A shared 120 x 176 plate overlaps the head underside. Two mirrored compact
// 2-link service arms fold down close to the shell edges.
const armPlate = roundedBox(104, 176, 18, 5, 0, 0, -83, C.alu)
  .union(roundedBox(18, 150, 26, 4, 0, 0, -65, C.dark));
placeOnMast('bolted-service-arm-mount-plate-under-K0-head', armPlate, headAlong);
for (const side of [-1, 1]) {
  const shoulder: [number, number, number] = [12, side * 104, -72];
  const elbow: [number, number, number] = [
    shoulder[0] + l1 * Math.cos(armPitch) * Math.cos(armYaw),
    shoulder[1] + side * l1 * 0.45,
    shoulder[2] - l1 * Math.sin(Math.abs(armPitch)),
  ];
  const wrist: [number, number, number] = [elbow[0] + l2 * 0.3, elbow[1] + side * l2 * 0.28, elbow[2] - l2 * 0.35];
  const sideLabel = side < 0 ? 'left' : 'right';
  headArmPart(`SO101-${sideLabel}-shoulder-servo-bolted-to-plate`, roundedBox(52, 54, 48, 9, shoulder[0], shoulder[1], shoulder[2], C.dark)
    .union(yCylinder(58, 19, shoulder[0], shoulder[1] - side * 27, shoulder[2], C.orange)), [0, 0, 0]);
  headArmPart(`SO101-${sideLabel}-upper-link`, link(shoulder, elbow, C.ivory, 30), [0, 0, 0]);
  headArmPart(`SO101-${sideLabel}-elbow-servo`, roundedBox(44, 44, 42, 8, elbow[0], elbow[1], elbow[2], C.dark)
    .union(yCylinder(46, 16, elbow[0], elbow[1] - side * 22, elbow[2], C.orange)), [0, 0, 0]);
  headArmPart(`SO101-${sideLabel}-fore-link`, link(elbow, wrist, C.ivory, 26), [0, 0, 0]);
  headArmPart(`SO101-${sideLabel}-wrist-tool-servo`, roundedBox(38, 38, 36, 7, wrist[0], wrist[1], wrist[2], C.dark), [0, 0, 0]);
}

// Graco AL-5-style light gun on carriage; the short K0 arm does not carry it.
const wristTiltDeg = param('wristTiltDeg', -8, { min: -30, max: 30, description: 'Single spray-gun wrist tilt (degrees).' });
const gunLocal = roundedBox(112, 60, 42, 10, 0, 0, 0, C.gunBlue)
  .union(roundedBox(58, 44, 48, 10, -74, 0, 0, C.gunSilver))
  .union(zCylinder(58, 20, -88, 0, 0, C.dark))
  .union(zCylinder(42, 16, -88, 0, -34, C.gunSilver))
  .union(roundedBox(38, 34, 78, 8, -22, 0, -56, C.gunBlue))
  .union(roundedBox(9, 8, 42, 3, 0, 0, -47, C.gunSilver))
  .union(roundedBox(76, 24, 22, 6, 85, 0, 0, C.gunSilver))
  .union(roundedBox(46, 16, 16, 5, 142, 0, 0, C.dark))
  .union(roundedBox(10, 58, 62, 7, 168, 0, 0, C.gunBlue))
  .union(roundedBox(9, 38, 46, 5, 173, 0, 0, C.black))
  .union(roundedBox(26, 10, 10, 3, 190, 0, 0, C.gunSilver));
const wristTilt = wristTiltDeg.value ?? -8;
// Carriage plate is at local X=160..205. Gun's heel is attached at X=195;
// body extends outward in +X, away from the mast and toward the façade.
const gunMountLocal = roundedBox(32, 54, 30, 6, 194, 78, -48, C.alu)
  .union(yCylinder(58, 18, 194, 48, -48, C.dark))
  .union(roundedBox(38, 56, 24, 5, 212, 78, -48, C.orange))
  .union(roundedBox(90, 88, 22, 6, 160, 34, -48, C.alu));
// Tool axis faces +Y (façade direction); pivot is fixed inside the wrist fork.
const gunLocalTilted = gunLocal.rotate([0, 0, 1], 90)
  .translate(194, 180, -48)
  .rotate([1, 0, 0], wristTilt, [194, 78, -48]);
placeOnMast('carriage-wrist-pin-and-gun-mount', gunMountLocal, carriageAlong);
placeOnMast('recognisable-airless-gun-body-grip-cylinder-tip-guard', gunLocalTilted, carriageAlong);

// Laser/depth standoff unit alongside nozzle with glass window and two-point mount.
const standoffLocal = roundedBox(46, 40, 34, 7, 158, 244, -20, C.dark)
  .union(roundedBox(24, 4, 22, 3, 158, 265, -20, C.glass))
  .union(roundedBox(22, 34, 14, 4, 158, 214, -33, C.alu));
placeOnMast('laser-depth-standoff-sensor-adjacent-to-spray-tip', standoffLocal, carriageAlong);

return robot.model();
