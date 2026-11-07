// SPDX-License-Identifier: CC0-1.0
// Microwave backhaul dish: a 0.6 m point-to-point dish with its outdoor radio
// unit, clamped to a pole on a ground plate.
// What makes it a microwave dish rather than a disc on a stick: a deep
// paraboloid reflector (f/D 0.25) with a rolled rim, either a cylindrical
// shroud closed by a flat radome (high-performance dish) or an open face with
// a feed horn held at the focus by three struts, a square radio unit bolted
// straight onto the back of the reflector, and a fine-adjust mount that grips
// the pole with two collars and an elevation strut.
// Generic visualization geometry at real size (dish centre 1.0 m above the
// plate), millimetres, Z up, dish facing -Y, ground on z = 0.

meta({
  name: "microwave-dish-antenna",
  license: 'CC0-1.0',
  title: "Microwave dish antenna",
  description: "Point-to-point microwave backhaul dish: 0.6 m paraboloid reflector with rolled rim, shroud and flat radome or an open face with a strut-held feed horn, square outdoor radio unit on the back, and a fine-adjust mount with two pole collars and an elevation strut on a pole with base plate. Material controls: aluminium reflector, radome, galvanized pole and mount, powder-coated radio unit. Field-site and high-visibility presets.",
  tags: ['microwave dish', 'backhaul', 'point-to-point', 'parabolic antenna', 'radome', 'ODU', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const style = param('style', 'shrouded', { choices: ['shrouded', 'open'], label: 'Dish face' });

const aluminum = param('aluminum', '#c2cacc', { label: 'Reflector and shroud (aluminium)' });
const radome = param('radome', '#eceeea', { label: 'Radome and feed (UV-stable polymer)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Pole, mount and base plate (galvanized steel)' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Outdoor radio unit (powder-coated)' });
presets({
  fieldSite: {
    aluminum: '#aeb9b9',
    radome: '#d9ddd6',
    galvanizedSteel: '#8f9b9b',
    powderCoat: '#52756b',
  },
  highVisibility: {
    aluminum: '#d4dada',
    radome: '#f4f4f0',
    galvanizedSteel: '#3a4b51',
    powderCoat: '#e0aa18',
  },
});

const p = assembly("microwave-dish-antenna");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turn a +Z-pointing shape to point along `d`, then move it to `at`.
const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const H = 1000; // dish centre height
const R = 300; // reflector radius
const F = 150; // focal length
// Everything on the dish is authored on its own axis (+Z out of the face,
// vertex at z = 0), then turned to face -Y and lifted to the dish centre.
const onDish = (shape) => shape.rotateX(90).translate(0, 0, H);
const zOf = (r) => (r * r) / (4 * F);

// Reflector shell: paraboloid back and face 6 mm apart, rolled lip at the rim.
const rs = [0, 75, 150, 225, R];
const shell = [
  ...rs.map((r) => [r, zOf(r)]),
  [R + 8, zOf(R) + 4],
  [R + 8, zOf(R) + 12],
  ...rs.slice().reverse().map((r) => [Math.max(r - 4, 0), zOf(r) + 6]),
];
add('reflector', onDish(turned(shell)).color(aluminum));
add('back-ring', onDish(turned([[140, zOf(140) - 14], [160, zOf(160) - 14], [160, zOf(160) + 1], [140, zOf(140) + 1]])).color(galvanizedSteel));

if (style.value === 'open') {
  // Feed horn at the focus, facing back into the dish, on three struts.
  add('feed-horn', onDish(turned([[0, F - 30], [16, F - 30], [44, F + 8], [44, F + 18], [0, F + 18]])).color(radome));
  add('feed-waveguide', onDish(turned([[0, 2], [11, 2], [11, F - 30], [0, F - 30]])).color(aluminum));
  for (let i = 0; i < 3; i += 1) {
    const a = (Math.PI / 2) + (i * 2 * Math.PI) / 3;
    add(`feed-strut-${i}`, onDish(rod([R * 0.93 * Math.cos(a), R * 0.93 * Math.sin(a), zOf(R * 0.93) + 6], [40 * Math.cos(a), 40 * Math.sin(a), F + 4], 6, 4)).color(galvanizedSteel));
  }
} else {
  // Cylindrical shroud carried forward of the rim, closed by a flat radome.
  add('shroud', onDish(turned([[R + 4, zOf(R) - 6], [R + 12, zOf(R) - 6], [R + 12, 330], [R + 4, 330]])).color(aluminum));
  add('radome', onDish(turned([[0, 326], [R + 16, 326], [R + 16, 336], [R - 40, 342], [0, 344]])).color(radome));
  add('radome-band', onDish(turned([[R + 11, 316], [R + 18, 316], [R + 18, 340], [R + 11, 340]])).color(galvanizedSteel));
}

// Outdoor radio unit bolted to the back of the reflector: square housing
// with finned back, carry handle and an N-type port.
add('odu-adaptor', onDish(turned([[0, -26], [70, -26], [70, 2], [0, 2]])).color(galvanizedSteel));
add('odu-housing', box(250, 96, 250, true).translate(0, 74, H).color(powderCoat));
for (let i = -2; i <= 2; i += 1) {
  add(`odu-fin-${i + 2}`, box(10, 22, 220, true).translate(i * 46, 132, H).color(powderCoat));
}
add('odu-handle', rod([-70, 112, H + 125], [-70, 112, H + 160], 6, 4).color(galvanizedSteel));
add('odu-handle-2', rod([70, 112, H + 125], [70, 112, H + 160], 6, 4).color(galvanizedSteel));
add('odu-handle-bar', rod([-76, 112, H + 160], [76, 112, H + 160], 8, 6).color(galvanizedSteel));
add('odu-port', turned([[0, 0], [14, 0], [14, 26], [10, 34], [0, 34]]).rotateX(180).translate(-80, 74, H - 125).color(galvanizedSteel));

// Pole and base plate behind the dish.
const PY = 250;
add('pole', turned([[0, 0], [38, 0], [38, H + 420], [0, H + 420]]).translate(0, PY, 0).color(galvanizedSteel));
add('pole-cap', turned([[0, 0], [42, 0], [42, 10], [24, 22], [0, 22]]).translate(0, PY, H + 420).color(galvanizedSteel));
add('base-plate', box(420, 420, 16, true).translate(0, PY, 8).color(galvanizedSteel));
for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  add(`gusset-${dx}-${dy}`, extrudePolygon([[38, 0], [170, 0], [38, 150]], 10)
    .rotateX(90).translate(0, 5, 16).rotateZ((Math.atan2(dy, dx) * 180) / Math.PI).translate(0, PY, 0).color(galvanizedSteel));
}
for (const [x, y] of [[-170, -170], [170, -170], [-170, 170], [170, 170]]) {
  add(`anchor-${x}-${y}`, turned([[0, 0], [16, 0], [16, 14], [0, 14]]).translate(x, PY + y, 16).color(galvanizedSteel));
}

// Fine-adjust mount: two pole collars, side arms out to the back ring and a
// threaded elevation strut between them.
for (const [tag, z] of [['upper', H + 175], ['lower', H - 175]]) {
  add(`collar-${tag}`, turned([[34, -40], [50, -40], [50, 40], [34, 40]]).translate(0, PY, z).color(galvanizedSteel));
  add(`arm-${tag}-l`, box(14, PY + 75, 70, true).translate(-110, (PY - 75) / 2, z).color(galvanizedSteel));
  add(`arm-${tag}-r`, box(14, PY + 75, 70, true).translate(110, (PY - 75) / 2, z).color(galvanizedSteel));
  add(`bridge-${tag}`, box(234, 30, 70, true).translate(0, PY - 40, z).color(galvanizedSteel));
}
add('elevation-strut', rod([150, -100, H - 200], [116, 200, H + 150], 9, 6).color(galvanizedSteel));
add('elevation-nut', turned([[0, -16], [18, -16], [18, 16], [0, 16]]).rotateX(-90).translate(133, 50, H - 25).color(powderCoat));

return p.model();
