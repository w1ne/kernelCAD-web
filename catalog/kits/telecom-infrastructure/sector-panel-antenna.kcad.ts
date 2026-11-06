// SPDX-License-Identifier: CC0-1.0
// Sector panel antenna: a 1.4 m cellular sector antenna on its pole mount, as
// seen three to a tower on every mobile site.
// What makes it a sector antenna rather than a plank: a tall narrow radome
// with a rounded D-section front and a flat back, moulded end caps, a row of
// 4.3-10 connectors and a remote-tilt motor on the bottom cap with black
// jumper cables curling down to the pole, and two tilt brackets that hold the
// panel off a galvanized pipe. The mechanical tilt bracket can lean the top
// forward for downtilt.
// Generic visualization geometry at real size (panel 1.4 m x 300 mm x 140 mm,
// pole 2.3 m), millimetres, Z up, panel facing -Y, ground on z = 0.

meta({
  name: "sector-panel-antenna",
  license: 'CC0-1.0',
  title: "Sector panel antenna",
  description: "Cellular sector panel antenna on a pole mount: 1.4 m radome with rounded D-section front and flat back, moulded end caps, four bottom connectors and a remote-tilt motor with jumper cables down the pole, and upper and lower tilt brackets clamped to a galvanized pipe on a gusseted base plate; plumb or 6 degree mechanical downtilt. Material controls: radome, end caps and brackets, galvanized pole, connectors and jumpers. Field-site and high-visibility presets.",
  tags: ['sector antenna', 'panel antenna', 'cellular antenna', '4G', '5G', 'base station', 'RET', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tilt = param('tilt', 'plumb', { choices: ['plumb', 'downtilt'], label: 'Mechanical tilt' });

const radome = param('radome', '#d6dadb', { label: 'Radome (UV-stable polymer)' });
const powderCoat = param('powderCoat', '#318b96', { label: 'End caps and tilt brackets (powder-coated)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Pole, clamps and base plate (galvanized steel)' });
const polymer = param('polymer', '#22292d', { label: 'Connectors, tilt motor and jumper cables (black polymer)' });
presets({
  fieldSite: {
    radome: '#c4c9c3',
    powderCoat: '#52756b',
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
  },
  highVisibility: {
    radome: '#eef0ee',
    powderCoat: '#e0aa18',
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
  },
});

const p = assembly("sector-panel-antenna");
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
// Radome cross-section: flat back at +Y, rounded front at -Y, grown by `g`.
const section = (g) => [
  [-150 - g, 70 + g], [-150 - g, -25], [-132 - g, -52 - g * 0.6], [-92, -67 - g], [-30, -72 - g],
  [30, -72 - g], [92, -67 - g], [132 + g, -52 - g * 0.6], [150 + g, -25], [150 + g, 70 + g],
];

const L = 1400; // panel length
const PZ = 700; // panel bottom height when plumb
const PIVOT = 150; // lower bracket height on the panel
const MY = 210; // pole axis, behind the panel
const TILT = tilt.value === 'downtilt' ? 6 : 0;
// Panel parts are authored with the panel bottom at z = 0, then tilted about
// the lower bracket pivot (top leaning forward) and lifted onto the pole.
const onPanel = (shape) => shape.translate(0, 0, -PIVOT).rotateX(TILT).translate(0, 0, PZ + PIVOT);
const panelPoint = ([x, y, z]) => {
  const a = (TILT * Math.PI) / 180;
  const zz = z - PIVOT;
  return [x, y * Math.cos(a) - zz * Math.sin(a), y * Math.sin(a) + zz * Math.cos(a) + PZ + PIVOT];
};

// Radome, end caps, rear spine and label.
add('radome', onPanel(extrudePolygon(section(0), L - 60).translate(0, 0, 30)).color(radome));
add('bottom-cap', onPanel(extrudePolygon(section(5), 30)).color(powderCoat));
add('top-cap', onPanel(extrudePolygon(section(5), 30).translate(0, 0, L - 30)).color(powderCoat));
add('rear-spine', onPanel(box(120, 14, L - 120, true).translate(0, 82, L / 2)).color(powderCoat));

// Bottom cap: four connectors and the remote electrical tilt motor.
const ports = [-105, -35, 35, 105];
for (const x of ports) {
  add(`connector-${x}`, onPanel(turned([[0, 0], [16, 0], [16, 18], [11, 22], [11, 48], [0, 48]]).rotateX(180).translate(x, 10, 0)).color(polymer));
}
add('ret-motor', onPanel(turned([[0, 0], [20, 0], [20, 80], [14, 90], [0, 90]]).rotateX(180).translate(0, 50, 0)).color(polymer));

// Jumpers: from each connector, curling back under the panel to the pole
// and down it to the plate.
for (const [i, x] of ports.entries()) {
  const a = panelPoint([x, 10, -48]);
  const b = [x * 0.7, a[1] + 40, PZ - 220];
  const c = [-60 + i * 18, MY - 44, PZ - 420];
  const d = [-60 + i * 18, MY - 44, 70];
  const e = [-60 + i * 18, MY - 120, 16];
  for (const [j, [s, t]] of [[a, b], [b, c], [c, d], [d, e]].entries()) {
    add(`jumper-${i}-${j}`, rod(s, t, 7, 5).color(polymer));
  }
}

// Pole and base plate.
add('pole', turned([[0, 0], [38, 0], [38, 2300], [0, 2300]]).translate(0, MY, 0).color(galvanizedSteel));
add('pole-cap', turned([[0, 0], [42, 0], [42, 10], [24, 22], [0, 22]]).translate(0, MY, 2300).color(galvanizedSteel));
add('base-plate', box(420, 420, 16, true).translate(0, MY, 8).color(galvanizedSteel));
for (let i = 0; i < 4; i += 1) {
  add(`gusset-${i}`, extrudePolygon([[38, 0], [170, 0], [38, 150]], 10)
    .rotateX(90).translate(0, 5, 16).rotateZ(45 + i * 90).translate(0, MY, 0).color(galvanizedSteel));
}

// Lower and upper brackets: twin arms from the panel spine to a clamp
// collar on the pole. The upper arms are longer when the panel is tilted.
for (const [tag, zp] of [['lower', PIVOT], ['upper', L - 150]]) {
  const zc = panelPoint([0, 89, zp])[2];
  add(`bracket-plate-${tag}`, onPanel(box(150, 12, 90, true).translate(0, 95, zp)).color(powderCoat));
  add(`collar-${tag}`, turned([[36, -45], [50, -45], [50, 45], [36, 45]]).translate(0, MY, zc).color(galvanizedSteel));
  for (const x of [-55, 55]) {
    add(`arm-${tag}-${x}`, rod(panelPoint([x, 98, zp]), [x * 0.6, MY - 30, zc], 11, 4).color(powderCoat));
  }
}

return p.model();
