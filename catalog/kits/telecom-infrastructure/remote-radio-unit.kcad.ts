// SPDX-License-Identifier: CC0-1.0
// Remote radio unit: the outdoor radio that sits on the pole next to a sector
// antenna, mounted on a stub pole here as a stand-alone prop.
// What makes it an RRU rather than a box: a cast-aluminium housing with
// chamfered front corners and a full face of vertical cooling fins, a carry
// handle on top, a connector panel underneath with two RF ports, a DC power
// plug, two fibre ports and a ground lug, cables dropping from them down the
// pole, a powder-coated sunshield over the top and sides, and a back bracket
// that grips the pole with two clamp collars.
// Generic visualization geometry at real size (400 x 160 x 480 mm unit, centre
// 1.2 m above the plate), millimetres, Z up, fins facing -Y, ground on z = 0.

meta({
  name: "remote-radio-unit",
  license: 'CC0-1.0',
  title: "Remote radio unit",
  description: "Pole-mounted remote radio unit: cast-aluminium housing with chamfered corners and a full face of vertical cooling fins, top carry handle, bottom connector panel with two RF ports, DC power plug, two fibre ports and ground lug, cables down the pole, optional powder-coated sunshield, and a back bracket with two clamp collars on a pole with gusseted base plate. Material controls: cast-aluminium housing, sunshield and bracket, galvanized pole, connectors and cables. Field-site and high-visibility presets.",
  tags: ['remote radio unit', 'RRU', 'RRH', 'radio head', 'cellular', 'base station', '4G', '5G', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const sunshield = param('sunshield', 'fitted', { choices: ['fitted', 'none'], label: 'Sunshield' });

const housing = param('housing', '#aab3b6', { label: 'Housing and cooling fins (cast aluminium)' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Sunshield and mounting bracket (powder-coated)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Pole, collars and base plate (galvanized steel)' });
const polymer = param('polymer', '#22292d', { label: 'Connectors and cables (black polymer)' });
presets({
  fieldSite: {
    housing: '#9ea8a6',
    powderCoat: '#52756b',
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
  },
  highVisibility: {
    housing: '#cfd5d6',
    powderCoat: '#e0aa18',
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
  },
});

const p = assembly("remote-radio-unit");
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

const W = 400;
const D = 160;
const HT = 480;
const Z0 = 960; // underside of the housing
const MY = 300; // pole axis, behind the unit

// Housing: chamfered front corners, flat back, extruded upwards.
add('housing', extrudePolygon([
  [-W / 2, D / 2], [-W / 2, -D / 2 + 30], [-W / 2 + 30, -D / 2], [W / 2 - 30, -D / 2], [W / 2, -D / 2 + 30], [W / 2, D / 2],
], HT).translate(0, 0, Z0).color(housing));
add('top-cover', extrudePolygon([
  [-W / 2 + 6, D / 2 - 6], [-W / 2 + 6, -D / 2 + 30], [-W / 2 + 32, -D / 2 + 6], [W / 2 - 32, -D / 2 + 6], [W / 2 - 6, -D / 2 + 30], [W / 2 - 6, D / 2 - 6],
], 14).translate(0, 0, Z0 + HT).color(housing));

// Cooling fins over the whole front face.
for (let i = 0; i < 11; i += 1) {
  add(`fin-${i}`, box(7, 34, HT - 40, true).translate(-150 + i * 30, -D / 2 - 15, Z0 + HT / 2).color(housing));
}

// Carry handle.
add('handle-l', rod([-90, 0, Z0 + HT + 14], [-90, 0, Z0 + HT + 54], 8, 6).color(polymer));
add('handle-r', rod([90, 0, Z0 + HT + 14], [90, 0, Z0 + HT + 54], 8, 6).color(polymer));
add('handle-grip', rod([-98, 0, Z0 + HT + 54], [98, 0, Z0 + HT + 54], 12, 6).color(polymer));

// Connector panel underneath: two RF ports, DC plug, two fibre ports and a
// ground lug, each with its cable dropping towards the pole.
add('connector-panel', box(W - 60, D - 40, 12, true).translate(0, 0, Z0 - 6).color(polymer));
const ports = [
  ['rf-1', -140, 22, 15],
  ['rf-2', -80, 22, 15],
  ['dc', 0, 30, 18],
  ['fibre-1', 70, 14, 8],
  ['fibre-2', 110, 14, 8],
];
for (const [i, [name, x, r, cr]] of ports.entries()) {
  add(`port-${name}`, turned([[0, 0], [r, 0], [r, 26], [r - 4, 30], [r - 4, 60], [0, 60]]).rotateX(180).translate(x, 0, Z0 - 12).color(polymer));
  const a = [x, 0, Z0 - 70];
  const b = [x * 0.5, 80, Z0 - 220];
  const c = [-48 + i * 22, MY - 50, Z0 - 380];
  const d = [-48 + i * 22, MY - 50, 80];
  const e = [-48 + i * 22, MY - 150, 18];
  for (const [j, [u, v]] of [[a, b], [b, c], [c, d], [d, e]].entries()) {
    add(`cable-${name}-${j}`, rod(u, v, cr, 5).color(polymer));
  }
}
add('ground-lug', box(26, 18, 40, true).translate(170, 40, Z0 - 32).color(galvanizedSteel));
add('ground-wire', rod([170, 40, Z0 - 52], [60, MY - 50, Z0 - 300], 5, 4).color(galvanizedSteel));

// Optional sunshield: a folded sheet over the top and both sides, standing
// off the housing on short spacers.
if (sunshield.value === 'fitted') {
  add('shield-top', box(W + 60, D + 40, 6, true).translate(0, 0, Z0 + HT + 80).color(powderCoat));
  add('shield-left', box(6, D + 40, HT + 40, true).translate(-W / 2 - 27, 0, Z0 + HT / 2 + 40).color(powderCoat));
  add('shield-right', box(6, D + 40, HT + 40, true).translate(W / 2 + 27, 0, Z0 + HT / 2 + 40).color(powderCoat));
  for (const x of [-1, 1]) {
    for (const z of [Z0 + 120, Z0 + HT - 120]) {
      add(`spacer-${x}-${z}`, rod([x * W / 2, 30, z], [x * (W / 2 + 25), 30, z], 8, 6).color(galvanizedSteel));
    }
  }
  add('spacer-top', rod([0, 30, Z0 + HT + 14], [0, 30, Z0 + HT + 78], 8, 6).color(galvanizedSteel));
}

// Back bracket: plate on the housing, two arms to clamp collars on the pole.
add('bracket-plate', box(260, 14, HT - 60, true).translate(0, D / 2 + 7, Z0 + HT / 2).color(powderCoat));
for (const z of [Z0 + 110, Z0 + HT - 110]) {
  add(`bracket-arm-l-${z}`, box(16, MY - D / 2 - 40, 70, true).translate(-70, (MY + D / 2 - 40) / 2 + 7, z).color(powderCoat));
  add(`bracket-arm-r-${z}`, box(16, MY - D / 2 - 40, 70, true).translate(70, (MY + D / 2 - 40) / 2 + 7, z).color(powderCoat));
  add(`bracket-bridge-${z}`, box(156, 20, 70, true).translate(0, MY - 46, z).color(powderCoat));
  add(`collar-${z}`, turned([[38, -40], [52, -40], [52, 40], [38, 40]]).translate(0, MY, z).color(galvanizedSteel));
}

// Pole and base plate.
add('pole', turned([[0, 0], [38, 0], [38, Z0 + HT + 300], [0, Z0 + HT + 300]]).translate(0, MY, 0).color(galvanizedSteel));
add('pole-cap', turned([[0, 0], [42, 0], [42, 10], [24, 22], [0, 22]]).translate(0, MY, Z0 + HT + 300).color(galvanizedSteel));
add('base-plate', box(420, 420, 16, true).translate(0, MY, 8).color(galvanizedSteel));
for (let i = 0; i < 4; i += 1) {
  add(`gusset-${i}`, extrudePolygon([[38, 0], [170, 0], [38, 150]], 10)
    .rotateX(90).translate(0, 5, 16).rotateZ(45 + i * 90).translate(0, MY, 0).color(galvanizedSteel));
}

return p.model();
