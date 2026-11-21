// SPDX-License-Identifier: CC0-1.0
// Horizontal receiver air compressor: the tank is carried by two saddles on
// a skid, with a belt-driven motor and ribbed reciprocating pump mounted
// above it. The pump count, pressure controls, receiver fittings and belt
// guard make this read as a compressor package instead of stacked cylinders.
// Generic visualization geometry in millimetres, Z up; controls face -Y.

meta({
  name: 'air-compressor',
  license: 'CC0-1.0',
  title: 'Industrial air compressor',
  description: 'Horizontal receiver compressor package with a saddled pressure tank, skid frame, belt-driven motor, finned pump heads, intake filter, pressure gauge, safety valve and drain. Receiver capacity and pump arrangement change the model. Material controls: receiver steel, cast iron, motor paint and rubber. plant, weathered and highVisibility presets.',
  tags: ['industrial plant', 'air compressor', 'reciprocating compressor', 'receiver tank', 'belt drive', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 5200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const receiverCapacity = param('receiverCapacity', '120-gallon', { choices: ['80-gallon', '120-gallon'], label: 'Receiver capacity' });
const pumpArrangement = param('pumpArrangement', 'twin', { choices: ['single', 'twin'], label: 'Pump arrangement' });
const receiverSteel = param('receiverSteel', '#657c87', { label: 'Receiver steel' });
const pumpIron = param('pumpIron', '#444b50', { label: 'Pump cast iron' });
const motorPaint = param('motorPaint', '#e1a72f', { label: 'Motor paint' });
const rubber = param('rubber', '#282d30', { label: 'Belt and feet rubber' });

presets({
  plant: { receiverSteel: '#657c87', pumpIron: '#444b50', motorPaint: '#e1a72f', rubber: '#282d30' },
  weathered: { receiverSteel: '#59605f', pumpIron: '#383b3c', motorPaint: '#a77a32', rubber: '#353534' },
  highVisibility: { receiverSteel: '#c5cbcd', pumpIron: '#48535a', motorPaint: '#e65d27', rubber: '#282d30' },
});

const p = assembly('air-compressor');
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w, d, h, true).translate(x, y, z);
const alongX = (length: number, radius: number, segments = 16) => cylinder(length, radius, segments).rotateY(90);
const alongY = (length: number, radius: number, segments = 16) => cylinder(length, radius, segments).rotateX(90);
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [radius, z] of pts.slice(1)) pb = pb.lineTo(radius, z);
  return pb.close().revolve();
};
const rod = (a: [number, number, number], b: [number, number, number], radius: number, segments = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / length) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(length, radius, segments).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const receiverLength = receiverCapacity.value === '120-gallon' ? 850 : 710;
const receiverRadius = receiverCapacity.value === '120-gallon' ? 168 : 148;
const receiverBottom = 155;
const receiverCenter = receiverBottom + receiverRadius;
const receiverTop = receiverCenter + receiverRadius;
const pumpDeck = receiverTop + 24;
const motorZ = pumpDeck + 82;

// Skid rails, cross members and isolation pads carry the receiver and drive.
for (const y of [-150, 150]) {
  add(`skid-rail-${y}`, blk(0, y, 35, receiverLength + 150, 48, 70).color(motorPaint));
  for (const [index, x] of [-receiverLength * 0.39, receiverLength * 0.39].entries()) {
    add(`isolation-pad-${index}-${y}`, blk(x, y, 7, 115, 72, 14).color(rubber));
    add(`rail-foot-${index}-${y}`, blk(x, y, 20, 82, 60, 26).color(motorPaint));
  }
}
for (const [index, x] of [-receiverLength * 0.34, receiverLength * 0.34].entries()) {
  add(`skid-crossmember-${index}`, blk(x, 0, 32, 52, 350, 42).color(motorPaint));
}

// Formed receiver shell with dished ends, weld seams, a top inspection boss
// and a bottom drain. Its two saddles land on the skid cross members.
const receiverProfile = [
  [0, 0], [receiverRadius * 0.68, 0], [receiverRadius * 0.91, 12],
  [receiverRadius, 34], [receiverRadius, receiverLength - 34],
  [receiverRadius * 0.91, receiverLength - 12], [receiverRadius * 0.68, receiverLength], [0, receiverLength],
];
add('horizontal-receiver', turned(receiverProfile).rotateY(90).translate(-receiverLength / 2, 0, receiverCenter).color(receiverSteel));
for (const [index, x] of [-receiverLength * 0.27, receiverLength * 0.27].entries()) {
  add(`receiver-weld-band-${index}`, torus(receiverRadius + 3, 5, 20).rotateY(90).translate(x, 0, receiverCenter).color(receiverSteel));
  add(`receiver-saddle-${index}`, blk(x, 0, receiverBottom - 48, 132, 250, 92).color(motorPaint));
  add(`saddle-cap-${index}`, blk(x, 0, receiverBottom - 1, 148, 270, 18).color(receiverSteel));
}
add('inspection-boss', cylinder(24, 36, 16).translate(receiverLength * 0.22, 0, receiverTop - 8).color(receiverSteel));
add('inspection-cover', cylinder(14, 29, 16).translate(receiverLength * 0.22, 0, receiverTop + 14).color(motorPaint));
add('receiver-drain', cylinder(68, 13, 12).translate(receiverLength * 0.31, 0, 28).color(receiverSteel));
add('drain-valve', cylinder(32, 21, 10).translate(receiverLength * 0.31, 0, 5).color(pumpIron));
add('drain-handle', blk(receiverLength * 0.31, -25, 20, 58, 12, 8).color(motorPaint));

// A common deck joins the electric motor and the reciprocating pump. The
// shafts and belt are shown on the camera side, inside an open guard frame.
add('drive-deck', blk(15, 0, pumpDeck, 510, 275, 24).color(motorPaint));
add('motor-mount-left', blk(-160, 0, pumpDeck + 38, 215, 180, 54).color(receiverSteel));
add('motor-mount-right', blk(-72, 0, pumpDeck + 38, 48, 190, 54).color(receiverSteel));
add('motor-body', alongX(220, 56, 18).translate(-260, 0, motorZ).color(motorPaint));
add('motor-fan-cover', alongX(34, 61, 18).translate(-278, 0, motorZ).color(pumpIron));
add('motor-terminal-box', blk(-154, 0, motorZ + 65, 92, 78, 44).color(motorPaint));
for (let i = 0; i < 9; i++) {
  const x = -240 + i * 20;
  add(`motor-cooling-fin-${i}`, alongX(7, 59, 16).translate(x, 0, motorZ).color(receiverSteel));
}

const headPositions = pumpArrangement.value === 'twin' ? [72, 190] : [132];
add('pump-crankcase', blk(132, 0, pumpDeck + 65, 190, 150, 92).color(pumpIron));
add('pump-crankcase-end', alongX(26, 50, 14).translate(222, 0, pumpDeck + 65).color(pumpIron));
for (const [index, x] of headPositions.entries()) {
  add(`pump-barrel-${index}`, cylinder(112, 38, 14).translate(x, 0, pumpDeck + 102).color(pumpIron));
  for (let fin = 0; fin < 6; fin++) {
    add(`pump-fin-${index}-${fin}`, cylinder(8, 45, 16).translate(x, 0, pumpDeck + 112 + fin * 15).color(receiverSteel));
  }
  add(`pump-head-${index}`, blk(x, 0, pumpDeck + 222, 82, 82, 46).color(pumpIron));
  add(`head-cap-${index}`, cylinder(12, 41, 14).translate(x, 0, pumpDeck + 245).color(pumpIron));
  for (const dx of [-28, 28]) {
    add(`head-bolt-${index}-${dx}`, cylinder(12, 5, 8).translate(x + dx, -35, pumpDeck + 264).color(receiverSteel));
  }
}

// Pulley pair, rubber belt and slotted guard establish the drive relationship.
const pulleyZ = motorZ;
add('motor-pulley', alongY(24, 34, 16).translate(-43, -92, pulleyZ).color(pumpIron));
add('pump-pulley', alongY(24, 46, 16).translate(132, -92, pulleyZ).color(pumpIron));
add('belt-loop', torus(98, 7, 24).rotateX(90).translate(44, -114, pulleyZ).color(rubber));
const guardOuter = extrudePolygon([
  [-104, pulleyZ - 80], [-66, pulleyZ - 117], [174, pulleyZ - 117],
  [215, pulleyZ - 79], [196, pulleyZ + 96], [152, pulleyZ + 126],
  [-62, pulleyZ + 126], [-105, pulleyZ + 88],
], 18).rotateX(90).translate(0, -125, 0);
const guardOpening = extrudePolygon([
  [-59, pulleyZ - 48], [-35, pulleyZ - 74], [145, pulleyZ - 74],
  [169, pulleyZ - 48], [156, pulleyZ + 64], [130, pulleyZ + 84],
  [-28, pulleyZ + 84], [-55, pulleyZ + 60],
], 20).rotateX(90).translate(0, -124, 0);
add('belt-guard-open-frame', guardOuter.subtract(guardOpening).color(motorPaint));
for (let slot = 0; slot < 4; slot++) {
  add(`guard-vent-slot-${slot}`, blk(-78 + slot * 22, -145, pulleyZ + 101, 10, 9, 28).color(pumpIron));
}

// Intake filter, discharge line, receiver manifold, gauge, regulator and
// relief valve form the visible pressure-control group above the tank.
const filterX = pumpArrangement.value === 'twin' ? 230 : 180;
add('intake-neck', cylinder(48, 12, 10).translate(filterX, -28, pumpDeck + 252).color(receiverSteel));
add('intake-filter', turned([[0, 0], [27, 0], [37, 12], [37, 84], [27, 96], [0, 96]])
  .translate(filterX, -28, pumpDeck + 285).color(rubber));
add('aftercooler-riser', rod([196, -52, pumpDeck + 235], [280, -52, pumpDeck + 180], 10, 10).color(receiverSteel));
add('aftercooler-run', rod([280, -52, pumpDeck + 180], [280, -52, receiverTop + 26], 10, 10).color(receiverSteel));
add('receiver-manifold', rod([205, -80, receiverTop + 30], [340, -80, receiverTop + 30], 11, 12).color(receiverSteel));
add('manifold-riser', rod([340, -80, receiverTop + 30], [340, -80, receiverTop + 100], 11, 12).color(receiverSteel));
add('pressure-switch', blk(226, -84, receiverTop + 68, 62, 60, 66).color(motorPaint));
add('pressure-switch-cap', cylinder(24, 20, 12).translate(226, -84, receiverTop + 113).color(pumpIron));
add('gauge-body', alongY(24, 35, 16).translate(337, -96, receiverTop + 116).color(pumpIron));
add('gauge-face', alongY(4, 28, 16).translate(337, -120, receiverTop + 116).color('#d9e0dc'));
add('gauge-pointer', box(4, 3, 20, true).rotateY(24).translate(337, -124, receiverTop + 117).color('#bd4738'));
add('relief-valve', cylinder(46, 17, 12).translate(382, -80, receiverTop + 16).color(receiverSteel));
add('relief-cap', cylinder(14, 25, 12).translate(382, -80, receiverTop + 45).color(motorPaint));
add('outlet-elbow', sphere(19).translate(360, -80, receiverTop + 22).color(receiverSteel));
add('outlet-coupling', alongY(32, 18, 12).translate(362, -94, receiverTop + 18).color(pumpIron));

// Small, separate control details add scale without crowding the triangle budget.
add('warning-label', box(54, 4, 26, true).rotateY(-8).translate(-200, -61, motorZ + 24).color('#ece7d8'));
add('indicator-red', sphere(9).translate(-154, -43, motorZ + 53).color('#bd4738'));
add('indicator-green', sphere(9).translate(-130, -43, motorZ + 53).color('#4c9c68'));

return p.model();
