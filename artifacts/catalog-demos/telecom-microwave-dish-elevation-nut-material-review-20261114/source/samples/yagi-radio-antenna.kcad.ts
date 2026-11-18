// SPDX-License-Identifier: CC0-1.0
// Yagi radio antenna: a seven-element directional Yagi on a stub mast, as used
// for UHF telemetry, SCADA and rural link radios.
// What makes it a Yagi rather than a rake: a long square boom clamped to the
// mast at its back end, one long reflector behind a folded-dipole driven
// element with its balun box, then five directors getting shorter towards the
// tip, each element passing through a black insulator, and the coax running
// back along the boom and down the mast. The elements lie flat for horizontal
// polarization or stand upright for vertical.
// Generic visualization geometry at real size (1.45 m boom 1.5 m above the
// plate), millimetres, Z up, beam pointing +X, ground on z = 0.

meta({
  name: "yagi-radio-antenna",
  license: 'CC0-1.0',
  title: "Yagi radio antenna",
  description: "Seven-element directional Yagi on a stub mast: square boom clamped by U-bolts to a mast plate, long reflector, folded-dipole driven element with balun box, five tapering directors on black insulators, end caps and coax down the mast to a gusseted base plate; horizontal or vertical polarization. Material controls: galvanized mast, aluminium boom, stainless elements, polymer insulators and coax. Field-site and high-visibility presets.",
  tags: ['yagi', 'yagi-uda', 'directional antenna', 'UHF', 'telemetry', 'SCADA radio', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polarization = param('polarization', 'horizontal', { choices: ['horizontal', 'vertical'], label: 'Element polarization' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Mast, clamp plate and base (galvanized steel)' });
const boom = param('boom', '#a9b6bb', { label: 'Boom (aluminium square tube)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Elements and U-bolts (stainless steel)' });
const polymer = param('polymer', '#22292d', { label: 'Insulators, balun box and coax (black polymer)' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    boom: '#9aa6a3',
    stainlessSteel: '#d0d9d6',
    polymer: '#2a3330',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    boom: '#e0aa18',
    stainlessSteel: '#e4e9e6',
    polymer: '#1a1f22',
  },
});

const p = assembly("yagi-radio-antenna");
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

const ZB = 1500; // boom height
const YB = -70; // boom stands off the front of the mast
const X0 = -300;
const X1 = 1150;
const vertical = polarization.value === 'vertical';
// Two ends of an element of half-length `h` crossing the boom at `x`.
const ends = (x, h, off = 0) => vertical
  ? [[x + off, YB, ZB - h], [x + off, YB, ZB + h]]
  : [[x + off, YB - h, ZB], [x + off, YB + h, ZB]];

// Mast, base plate and gussets.
add('mast', turned([[0, 0], [30, 0], [30, ZB + 160], [0, ZB + 160]]).color(galvanizedSteel));
add('mast-cap', turned([[0, 0], [33, 0], [33, 10], [18, 20], [0, 20]]).translate(0, 0, ZB + 160).color(polymer));
add('base-plate', box(360, 360, 14, true).translate(0, 0, 7).color(galvanizedSteel));
for (let i = 0; i < 4; i += 1) {
  add(`gusset-${i}`, extrudePolygon([[30, 0], [150, 0], [30, 130]], 10)
    .rotateX(90).translate(0, 5, 14).rotateZ(45 + i * 90).color(galvanizedSteel));
}
for (const [x, y] of [[-140, -140], [140, -140], [-140, 140], [140, 140]]) {
  add(`anchor-${x}-${y}`, turned([[0, 0], [14, 0], [14, 12], [0, 12]]).translate(x, y, 14).color(galvanizedSteel));
}

// Clamp plate between mast and boom, two U-bolts round the mast and two
// round the boom.
add('clamp-plate', box(170, 24, 150, true).translate(0, -42, ZB).color(galvanizedSteel));
for (const dz of [-50, 50]) {
  add(`mast-ubolt-l${dz}`, rod([-38, -30, ZB + dz], [-38, 40, ZB + dz], 5, 4).color(stainlessSteel));
  add(`mast-ubolt-r${dz}`, rod([38, -30, ZB + dz], [38, 40, ZB + dz], 5, 4).color(stainlessSteel));
  add(`mast-ubolt-b${dz}`, rod([-43, 38, ZB + dz], [43, 38, ZB + dz], 5, 4).color(stainlessSteel));
}
for (const dx of [-60, 60]) {
  add(`boom-ubolt-t${dx}`, rod([dx, -54, ZB + 22], [dx, -92, ZB + 22], 5, 4).color(stainlessSteel));
  add(`boom-ubolt-b${dx}`, rod([dx, -54, ZB - 22], [dx, -92, ZB - 22], 5, 4).color(stainlessSteel));
  add(`boom-ubolt-f${dx}`, rod([dx, -90, ZB - 26], [dx, -90, ZB + 26], 5, 4).color(stainlessSteel));
}

// Boom and its end caps.
add('boom', box(X1 - X0, 30, 30, true).translate((X0 + X1) / 2, YB, ZB).color(boom));
add('end-cap-rear', box(14, 34, 34, true).translate(X0 - 7, YB, ZB).color(polymer));
add('end-cap-front', box(14, 34, 34, true).translate(X1 + 7, YB, ZB).color(polymer));

// Reflector, then five directors stepping down in length.
const insulator = (x) => box(44, 36, 36, true).translate(x, YB, ZB).color(polymer);
const elements = [['reflector', -250, 290], ['director-1', 160, 225], ['director-2', 380, 220], ['director-3', 600, 214], ['director-4', 820, 208], ['director-5', 1060, 202]];
for (const [name, x, h] of elements) {
  const [a, b] = ends(x, h);
  add(name, rod(a, b, 6).color(stainlessSteel));
  add(`${name}-insulator`, insulator(x));
}

// Folded-dipole driven element: two parallel rods joined at the tips, fed
// from a balun box under the boom.
const XD = -60;
const [d0, d1] = ends(XD, 245, -16);
const [e0, e1] = ends(XD, 245, 16);
add('driven-a', rod(d0, d1, 6).color(stainlessSteel));
add('driven-b', rod(e0, e1, 6).color(stainlessSteel));
add('driven-tip-1', rod(d0, e0, 6).color(stainlessSteel));
add('driven-tip-2', rod(d1, e1, 6).color(stainlessSteel));
add('driven-insulator', box(70, 40, 40, true).translate(XD, YB, ZB).color(polymer));
add('balun-box', box(70, 56, 90, true).translate(XD, YB, ZB - 65).color(polymer));
add('balun-gland', turned([[0, 0], [10, 0], [10, 18], [0, 18]]).rotateY(-90).translate(XD - 35, YB, ZB - 85).color(polymer));

// Coax from the balun back to the mast and down to the plate.
const coax = [[XD - 53, YB, ZB - 85], [-34, YB + 10, ZB - 140], [-34, 0, ZB - 220], [-34, 0, 260], [-34, 0, 60], [-60, -60, 14]];
for (let i = 0; i < coax.length - 1; i += 1) {
  add(`coax-${i}`, rod(coax[i], coax[i + 1], 6, 5).color(polymer));
}
for (const z of [ZB - 420, 900, 500]) {
  add(`cable-tie-${z}`, turned([[30, -8], [40, -8], [40, 8], [30, 8]]).translate(0, 0, z).color(polymer));
}

return p.model();
