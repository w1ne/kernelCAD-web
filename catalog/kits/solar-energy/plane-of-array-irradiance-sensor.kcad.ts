// Plane-of-array irradiance sensor: the instrument a solar plant uses to
// measure the sunlight actually landing on the tilted module face.
// What makes it one rather than a disc on a pole: a mounting plate tilted to
// the same angle as the array, carrying a pyranometer (white sun-shield disc,
// body with levelling feet, double glass domes and a cable gland) and a
// framed silicon reference cell side by side, on a galvanized mast with a
// pipe clamp, ground plate and anchor bolts, with the signal cable dropping
// to a small logger box at the foot.
// Generic visualization geometry at real size (mast about 1.1 m to the plate),
// millimetres, Z up, ground plate on z = 0.
meta({
  name: 'plane-of-array-irradiance-sensor',
  license: 'CC0-1.0',
  title: 'Plane-of-array irradiance sensor',
  description: 'Plane-of-array irradiance station at real size: tilted mounting plate matching the array angle, carrying a pyranometer with white sun shield, levelling feet and double glass domes, and a framed silicon reference cell, on a galvanized mast with pipe clamp, anchored ground plate and a logger box with signal cable. Tilt choice (15-35 degrees) and sensor choice (pyranometer, reference cell or both). Material controls: galvanized steel, sensor housing, dome glass, silicon cell, cable rubber; fieldService, blackCell and weathered presets.',
  tags: ['irradiance sensor', 'pyranometer', 'reference cell', 'POA', 'solar monitoring', 'photovoltaic', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 2100
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const tilt = param('tilt', '25deg', { choices: ['15deg', '25deg', '35deg'], label: 'Plane-of-array tilt' });
const sensors = param('sensors', 'both', { choices: ['pyranometer', 'referenceCell', 'both'], label: 'Sensors fitted' });
const galvanizedSteel = param('galvanizedSteel', '#8a9497', { label: 'Galvanized mast, plate and clamps' });
const sensorHousing = param('sensorHousing', '#eef0ec', { label: 'Sensor housing and sun shield' });
const domeGlass = param('domeGlass', '#a9c9d6', { label: 'Pyranometer dome glass' });
const siliconCell = param('siliconCell', '#1d3a63', { label: 'Reference cell silicon' });
const cableRubber = param('cableRubber', '#22272a', { label: 'Signal cable and glands' });
presets({
  fieldService: { galvanizedSteel: '#68787b', sensorHousing: '#e2e4dc', siliconCell: '#21466f' },
  blackCell: { siliconCell: '#16191d', sensorHousing: '#f4f4ef', galvanizedSteel: '#9aa3a5' },
  weathered: { galvanizedSteel: '#7c7a70', sensorHousing: '#d6d2c2', domeGlass: '#b7c2bd', cableRubber: '#34342f' },
});

const p = assembly('plane-of-array-irradiance-sensor');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Quarter-circle dome profile, radius r, n steps.
const dome = (r, n = 5) => [[0, 0], ...Array.from({ length: n + 1 }, (_, i) => {
  const a = (i / n) * (Math.PI / 2);
  return [r * Math.cos(a), r * Math.sin(a)];
})];

const T = { '15deg': 15, '25deg': 25, '35deg': 35 }[tilt.value];
const MAST = 1100;
const showPyr = sensors.value !== 'referenceCell';
const showCell = sensors.value !== 'pyranometer';

// Ground plate, anchor bolts, mast and the foot logger box.
add('ground-plate', box(260, 260, 12, true).translate(0, 0, 6).color(galvanizedSteel));
for (const [i, [x, y]] of [[-100, -100], [100, -100], [100, 100], [-100, 100]].entries()) {
  add(`anchor-nut-${i}`, cylinder(14, 13, 6).translate(x, y, 12).color(galvanizedSteel));
}
add('mast-base-gusset', turned([[0, 0], [70, 0], [70, 8], [36, 60], [0, 60]]).translate(0, 0, 12).color(galvanizedSteel));
add('mast', cylinder(MAST - 12, 30, 12).translate(0, 0, 12).color(galvanizedSteel));
add('mast-cap', turned([[0, 0], [33, 0], [33, 10], [20, 18], [0, 18]]).translate(0, 0, MAST).color(galvanizedSteel));
add('logger-box', box(200, 110, 260, true).translate(0, -88, 380).color(sensorHousing));
add('logger-box-lid', box(206, 8, 266, true).translate(0, -147, 380).color(sensorHousing));
add('logger-box-strap', box(220, 30, 20, true).translate(0, -20, 510).color(galvanizedSteel));
add('logger-gland', cylinder(16, 9, 8).translate(40, -88, 234).color(cableRubber));

// Pipe clamp and tilt bracket at the mast top. The plate faces south (-Y),
// tilted back by the array angle about X.
const ZP = MAST - 60;
add('pipe-clamp', turned([[30, 0], [44, 0], [44, 70], [30, 70]]).translate(0, 0, ZP - 40).color(galvanizedSteel));
add('tilt-bracket', box(16, 90, 110, true).translate(0, 0, ZP + 55).color(galvanizedSteel));
add('tilt-pivot', cylinder(40, 14, 8).rotateY(90).translate(-20, 0, ZP + 95).color(galvanizedSteel));
// Plate-local frame: u along X, v up the tilted plate (toward +Y), w out of the face.
const onPlate = (shape, u, v, w) => shape.translate(u, v, w).rotateX(T).translate(0, 0, ZP + 110);
const PW = showPyr && showCell ? 520 : 300;
add('mounting-plate', onPlate(box(PW, 220, 8, true), 0, 0, 4).color(galvanizedSteel));
add('plate-lip', onPlate(box(PW, 8, 30, true), 0, -110, -11).color(galvanizedSteel));

// Pyranometer: sun shield, body, levelling feet, inner and outer domes, gland.
const XP = showCell ? -PW / 2 + 140 : 0;
if (showPyr) {
  for (const [i, a] of [90, 210, 330].entries()) {
    const r = 58;
    add(`pyr-foot-${i}`, onPlate(cylinder(10, 7, 6), XP + r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180), 8).color(galvanizedSteel));
  }
  add('pyr-body', onPlate(turned([[0, 0], [52, 0], [52, 34], [44, 40], [0, 40]]), XP, 0, 18).color(sensorHousing));
  add('pyr-sun-shield', onPlate(turned([[38, 0], [75, 0], [75, 4], [70, 8], [38, 8]]), XP, 0, 44).color(sensorHousing));
  add('pyr-level-bubble', onPlate(cylinder(4, 8, 8), XP + 55, -38, 52).color(domeGlass));
  add('pyr-outer-dome', onPlate(turned(dome(25)), XP, 0, 58).color(domeGlass));
  add('pyr-inner-dome', onPlate(turned(dome(17)), XP, 0, 60).color(domeGlass));
  add('pyr-sensor-disc', onPlate(cylinder(2, 12, 12), XP, 0, 76).color(siliconCell));
  add('pyr-gland', onPlate(cylinder(22, 8, 8).rotateX(90), XP, -52, 32).color(cableRubber));
}

// Reference cell: anodised frame, glass-covered silicon cell, junction pod.
const XC = showPyr ? PW / 2 - 140 : 0;
if (showCell) {
  add('cell-frame', onPlate(box(180, 180, 22, true), XC, 0, 19).color(sensorHousing));
  add('cell-silicon', onPlate(box(150, 150, 2, true), XC, 0, 31).color(siliconCell));
  for (let i = 1; i < 4; i += 1) {
    add(`cell-finger-${i}`, onPlate(box(2, 148, 1, true), XC - 75 + i * 37.5, 0, 32.5).color(sensorHousing));
  }
  add('cell-junction-pod', onPlate(box(60, 40, 26, true), XC, 70, -13).color(sensorHousing));
}

// Signal cable from the sensors down the mast into the logger box.
add('cable-loop', rod([showPyr ? XP : XC, -170, ZP + 80], [10, -40, ZP - 60], 4, 6).color(cableRubber));
add('cable-drop', rod([10, -40, ZP - 60], [40, -40, 520], 4, 6).color(cableRubber));
add('cable-to-logger', rod([40, -40, 520], [40, -88, 250], 4, 6).color(cableRubber));
for (let i = 0; i < 4; i += 1) {
  add(`cable-tie-${i}`, turned([[30, 0], [34, 0], [34, 8], [30, 8]]).translate(0, 0, 600 + i * 110).color(cableRubber));
}

return p.model();
