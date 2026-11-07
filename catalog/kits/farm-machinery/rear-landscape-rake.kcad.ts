// SPDX-License-Identifier: CC0-1.0
// Three-point landscape rake: a compact A-frame headstock with hitch pins and
// top-link mast, a centre beam to a swivel turntable, and a long square rake
// bar carrying a comb of curved spring-steel tines. The bar can be angled to
// windrow material and optional gauge wheels ride at its ends.
// Generic visualization geometry in millimetres, Z up, travel towards +Y.
meta({
  name: "rear-landscape-rake",
  license: 'CC0-1.0',
  title: "Rear landscape rake",
  description: "Three-point landscape rake with an A-frame headstock, hitch pins, swivel turntable and a long rake bar carrying curved spring-steel tines. Selectable working width, rake angle and end gauge wheels. Material controls: frame paint, spring-steel tines, hitch hardware and tire rubber; weathered and highVisibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'landscaping', 'rake', 'three-point hitch', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const rakeWidth = param('rakeWidth', '1800', { choices: ['1500', '1800', '2100'], label: 'Working width (mm)' });
const rakeAngle = param('rakeAngle', '0', { choices: ['0', '15', '30'], label: 'Rake angle (deg)' });
const gaugeWheels = param('gaugeWheels', 'yes', { choices: ['yes', 'no'], label: 'Gauge wheels' });
const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Frame paint' });
const steelColor = param('steelColor', '#929b9b', { label: 'Spring-steel tines' });
const hardwareColor = param('hardwareColor', '#c7c2b4', { label: 'Hitch hardware' });
const tireRubberColor = param('tireRubberColor', '#26282a', { label: 'Tire rubber' });
presets({
  weathered: {
    paintedSteelColor: '#53694d',
    steelColor: '#7c6a58',
    hardwareColor: '#8d877a',
    tireRubberColor: '#3b3a37',
  },
  highVisibility: {
    paintedSteelColor: '#db762c',
    steelColor: '#c3c9c4',
    hardwareColor: '#e8e3d2',
    tireRubberColor: '#1d1f21',
  },
});

const width = Number(rakeWidth.value);
const yaw = Number(rakeAngle.value);
const beamZ = 470;
const pivotY = -520;
const p = assembly('rear-landscape-rake');
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.scale(scale).color(finish));
// Rake-bar parts are modelled about the swivel and turned by the rake angle.
const addSwung = (name, shape, finish = paintedSteelColor) => add(name, shape.rotateZ(yaw).translate(0, pivotY, 0), finish);

// Closed (y, z) side outline extruded `thickness` across X, centred on x = 0.
const sideProfile = (pts, thickness) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [y, z] of pts.slice(1)) outline = outline.lineTo(y, z);
  return outline.close().extrude(thickness).rotateX(90).rotateZ(90).translate(-thickness / 2, 0, 0);
};
// A bent bar of constant width following a (y, z) centreline.
const bentBar = (line, barWidth, thickness) => {
  const offsets = line.map((point, i) => {
    const [y0, z0] = line[Math.max(0, i - 1)];
    const [y1, z1] = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(y1 - y0, z1 - z0);
    return [(-(z1 - z0) / len) * (barWidth / 2), ((y1 - y0) / len) * (barWidth / 2)];
  });
  const left = line.map(([y, z], i) => [y + offsets[i][0], z + offsets[i][1]]);
  const right = line.map(([y, z], i) => [y - offsets[i][0], z - offsets[i][1]]).reverse();
  return sideProfile([...left, ...right], thickness);
};
const axle = (length, radius, sides) => cylinder(length, radius, sides).rotateY(90).translate(-length / 2, 0, 0);

// Headstock: lower cross tube with link pins, two triangular mast plates up
// to the top-link pin, and a centre beam running back to the swivel.
add('lower-cross-tube', box(820, 90, 90, true).translate(0, 120, 380));
for (const side of [-1, 1]) {
  const s = side < 0 ? '-left' : '-right';
  add('mast-plate' + s, sideProfile([[200, 340], [40, 340], [-380, 430], [-380, 515], [60, 980], [150, 980], [150, 420]], 20).translate(side * 120, 0, 0));
  add('lower-link-bracket' + s, sideProfile([[60, 330], [240, 300], [240, 400], [60, 430]], 20).translate(side * 360, 0, 0));
  add('lower-hitch-pin' + s, axle(180, 24, 8).translate(side * 410, 200, 350), hardwareColor);
}
add('top-link-pin', axle(300, 20, 8).translate(0, 105, 935), hardwareColor);
add('centre-beam', box(100, 700, 100, true).translate(0, -170, beamZ));
add('swivel-turntable', cylinder(30, 130, 12).translate(0, pivotY, beamZ - 80), hardwareColor);
add('swivel-lock-pin', cylinder(160, 18, 6).translate(0, pivotY + 90, beamZ - 70), hardwareColor);

// Rake bar and tine comb. Each tine drops from the bar, then curls forward
// and back out at the toe so it scarifies rather than digs.
addSwung('rake-bar', box(width, 100, 100, true).translate(0, 0, beamZ - 130));
const tineLine = [[-30, beamZ - 180], [-55, 260], [-45, 140], [0, 60], [70, 22], [130, 18]];
const tineCount = Math.round(width / 85);
for (let i = 0; i < tineCount; i += 1) {
  const x = (i - (tineCount - 1) / 2) * (width - 80) / (tineCount - 1);
  addSwung('tine-' + (i + 1), bentBar(tineLine, 26, 16).translate(x, 0, 0), steelColor);
}
for (const side of [-1, 1]) {
  const s = side < 0 ? '-left' : '-right';
  const x = side * (width / 2 + 10);
  addSwung('end-plate' + s, sideProfile([[90, beamZ - 70], [-120, beamZ - 70], [-120, 140], [60, 90]], 14).translate(x, 0, 0));
  if (gaugeWheels.value === 'yes') {
    addSwung('gauge-arm' + s, bentBar([[-40, beamZ - 120], [-200, 360], [-320, 180]], 60, 30).translate(x + side * 30, 0, 0));
    addSwung('gauge-tire' + s, axle(110, 180, 16).translate(x + side * 110, -320, 180), tireRubberColor);
    addSwung('gauge-rim' + s, axle(122, 100, 10).translate(x + side * 110, -320, 180), paintedSteelColor);
    addSwung('gauge-axle' + s, axle(180, 24, 6).translate(x + side * 80, -320, 180), hardwareColor);
  }
}

return p.model();
