// SPDX-License-Identifier: CC0-1.0
// Monopole antenna mast: the single tapered steel pole that carries a cell
// site's antennas where a lattice tower would be too intrusive.
// What makes it a monopole rather than a pole: a twelve-sided shaft that
// tapers in three slip-jointed sections, a base plate bolted to a concrete
// pier with an anchor-bolt ring, a cable port with a cover near the base, step
// bolts climbing two faces, and at the top a ring mount carrying three sector
// arms with panel antennas, jumper cables into the shaft, a lightning finial
// and a red obstruction beacon.
// Generic visualization geometry at reduced real size (12 m to the top of the
// shaft), millimetres, Z up, ground on z = 0.

meta({
  name: "monopole-mast",
  license: 'CC0-1.0',
  title: "Monopole antenna mast",
  description: "Cell-site monopole: twelve-sided galvanized shaft tapering in three slip-jointed sections, base plate with anchor-bolt ring on a concrete pier, cable port with cover, step bolts on two faces, top ring mount with three sector arms and panel antennas, jumper cables, lightning finial and red obstruction beacon. Material controls: galvanized shaft and steelwork, concrete pier, antenna radomes, polymer cables, beacon lens. Field-site, painted-stealth and high-visibility presets.",
  tags: ['monopole', 'cell tower', 'antenna mast', 'telecom tower', 'sector antenna', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const sectors = param('sectors', '3', { choices: ['1', '2', '3'], label: 'Sector arms' });

const galvanizedSteel = param('galvanizedSteel', '#8d999e', { label: 'Shaft, base plate and arms (galvanized steel)' });
const concrete = param('concrete', '#b8b4aa', { label: 'Foundation pier (concrete)' });
const radome = param('radome', '#e9ebe6', { label: 'Panel antenna radomes' });
const polymer = param('polymer', '#22292d', { label: 'Jumper cables and port seal (black polymer)' });
const beacon = param('beacon', '#d3301f', { label: 'Obstruction beacon lens' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    concrete: '#a8a497',
    radome: '#d9ddd5',
    polymer: '#263a37',
    beacon: '#c62a1c',
  },
  paintedStealth: {
    galvanizedSteel: '#5d6b4f',
    concrete: '#9a9585',
    radome: '#62704f',
    polymer: '#2e3527',
    beacon: '#c62a1c',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    concrete: '#c7c3b8',
    radome: '#f3f3ee',
    polymer: '#27363c',
    beacon: '#ff3b1f',
  },
});

const p = assembly("monopole-mast");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);

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
const ngon = (r, s) => {
  let profile = path().moveTo(r, 0);
  for (let i = 1; i < s; i += 1) {
    const a = (2 * Math.PI * i) / s;
    profile = profile.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return profile.close();
};
// Twelve-sided tapered shaft section from z0 (radius r0) to z1 (radius r1).
const section = (z0, z1, r0, r1) => ngon(r0, 12).loft([ngon(r1, 12)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, z1 - z0] },
  ],
  ruled: true,
}).translate(0, 0, z0);
// Radius of the shaft at height z (used to sit fittings on its faces).
const shaftR = (z) => 300 - (z - 350) * (130 / 11450);

// Concrete pier, base plate and anchor bolt ring.
add('pier', extrudePolygon(circle(720, 16), 300).color(concrete));
add('base-plate', extrudePolygon(circle(560, 12), 50).translate(0, 0, 300).color(galvanizedSteel));
for (let i = 0; i < 12; i += 1) {
  const a = (2 * Math.PI * (i + 0.5)) / 12;
  const [x, y] = [470 * Math.cos(a), 470 * Math.sin(a)];
  add(`anchor-bolt-${i}`, rod([x, y, 350], [x, y, 470], 22, 6).color(galvanizedSteel));
  add(`anchor-nut-${i}`, rod([x, y, 350], [x, y, 400], 40, 6).color(galvanizedSteel));
}
for (let i = 0; i < 12; i += 1) {
  add(`stiffener-${i}`, extrudePolygon([[290, 0], [520, 0], [520, 60], [290, 380]], 20)
    .rotateX(90).translate(0, 10, 350).rotateZ(i * 30).color(galvanizedSteel));
}

// Shaft in three slip-jointed sections, each overlapping the one below.
add('shaft-lower', section(350, 4600, 300, shaftR(4600)).color(galvanizedSteel));
add('shaft-middle', section(4300, 8500, shaftR(4300) + 14, shaftR(8500)).color(galvanizedSteel));
add('shaft-upper', section(8200, 11800, shaftR(8200) + 14, shaftR(11800)).color(galvanizedSteel));
for (const z of [4300, 8200]) {
  add(`slip-collar-${z}`, extrudePolygon(circle(shaftR(z) + 26, 12), 60).rotateZ(15).translate(0, 0, z).color(galvanizedSteel));
}

// Cable port near the base with a bolted cover and a sealed cable entry.
add('port-cover', b(0, -shaftR(1200) - 6, 900, 300, 24, 600).color(galvanizedSteel));
add('port-seal', b(0, -shaftR(1200) - 22, 1450, 140, 12, 60).color(polymer));

// Step bolts alternating up two opposite faces.
for (let i = 0; i < 24; i += 1) {
  const z = 2600 + i * 380;
  const r = shaftR(z);
  for (const s of [-1, 1]) {
    const y = s * (i % 2 === 0 ? 70 : -70);
    add(`step-${i}-${s}`, rod([s * (r - 10), y, z], [s * (r + 190), y, z], 11, 5).color(galvanizedSteel));
  }
}

// Top: cap plate, ring mount and sector arms with panel antennas.
const ZT = 11800;
add('top-plate', extrudePolygon(circle(shaftR(ZT) + 40, 12), 30).translate(0, 0, ZT).color(galvanizedSteel));
for (const z of [ZT - 900, ZT - 150]) {
  add(`ring-mount-${z}`, path().moveTo(shaftR(z) + 10, 0).lineTo(shaftR(z) + 70, 0).lineTo(shaftR(z) + 70, 120).lineTo(shaftR(z) + 10, 120).close().revolve()
    .translate(0, 0, z).color(galvanizedSteel));
}
const ARM = 1300;
for (let k = 0; k < Number(sectors.value); k += 1) {
  const a = (k * 120 + 30) * (Math.PI / 180);
  const [cx, cy] = [Math.cos(a), Math.sin(a)];
  const deg = k * 120 + 30;
  for (const z of [ZT - 840, ZT - 90]) {
    add(`arm-${k}-${z}`, b((ARM + 150) / 2, 0, z - 40, ARM - 150, 90, 90).rotateZ(deg).color(galvanizedSteel));
  }
  add(`arm-brace-${k}`, rod([(shaftR(ZT - 800) + 60) * cx, (shaftR(ZT - 800) + 60) * cy, ZT - 790], [(ARM - 250) * cx, (ARM - 250) * cy, ZT - 100], 22, 5).color(galvanizedSteel));
  // Face pipe across the arm ends, carrying the panel.
  add(`face-pipe-${k}`, rod([ARM * cx, ARM * cy, ZT - 1500], [ARM * cx, ARM * cy, ZT + 300], 40, 8).color(galvanizedSteel));
  add(`panel-${k}`, b(0, 0, 0, 160, 340, 1500).translate(ARM + 160, 0, ZT - 1450).rotateZ(deg).color(radome));
  add(`panel-cap-top-${k}`, b(0, 0, 0, 170, 350, 40).translate(ARM + 160, 0, ZT + 50).rotateZ(deg).color(polymer));
  add(`panel-cap-bottom-${k}`, b(0, 0, 0, 170, 350, 40).translate(ARM + 160, 0, ZT - 1490).rotateZ(deg).color(polymer));
  for (const z of [ZT - 1300, ZT - 100]) {
    add(`panel-bracket-${k}-${z}`, b(0, 0, 0, 120, 60, 60).translate(ARM + 40, 0, z).rotateZ(deg).color(galvanizedSteel));
  }
  // Jumper cables from the panel bottom into the shaft.
  const j0 = [(ARM + 160) * cx, (ARM + 160) * cy, ZT - 1490];
  const j1 = [(ARM + 60) * cx, (ARM + 60) * cy, ZT - 1900];
  const j2 = [(shaftR(ZT - 1400) + 20) * cx, (shaftR(ZT - 1400) + 20) * cy, ZT - 1400];
  add(`jumper-${k}-a`, rod(j0, j1, 16, 5).color(polymer));
  add(`jumper-${k}-b`, rod(j1, j2, 16, 5).color(polymer));
}

// Lightning finial and obstruction beacon on the top plate.
add('finial', rod([120, 0, ZT + 30], [120, 0, ZT + 1800], 18, 6).color(galvanizedSteel));
add('finial-tip', path().moveTo(0, 0).lineTo(28, 0).lineTo(0, 200).close().revolve().translate(120, 0, ZT + 1800).color(galvanizedSteel));
add('beacon-stalk', rod([-120, 0, ZT + 30], [-120, 0, ZT + 500], 30, 8).color(galvanizedSteel));
add('beacon-base', path().moveTo(0, 0).lineTo(90, 0).lineTo(90, 60).lineTo(0, 60).close().revolve().translate(-120, 0, ZT + 500).color(polymer));
add('beacon-lens', path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 70).lineTo(55, 140).lineTo(0, 160).close().revolve().translate(-120, 0, ZT + 560).color(beacon));

return p.model();
