// SPDX-License-Identifier: CC0-1.0
// Omnidirectional whip antenna: a fibreglass collinear omni of the kind used
// for private radio, telemetry and IoT gateways, side-mounted off a short mast.
// What makes it an omni rather than a stick: a long white fibreglass radome
// that tapers to a domed tip, a chromed base ferrule with an N-type connector
// and weatherproofing boot underneath, a stand-off bracket with clamp collars
// that holds it clear of the mast, a coax drip loop running back to the mast
// and cable-tied down it, and a galvanized mast stub on a bolted base plate.
// Generic visualization geometry at real size (1.6 m radome, 2.4 m overall),
// millimetres, Z up, ground on z = 0.

meta({
  name: "omnidirectional-whip-antenna",
  license: 'CC0-1.0',
  title: "Omnidirectional whip antenna",
  description: "Fibreglass collinear omnidirectional antenna: tapered white radome with domed tip and decoupling bands, chromed base ferrule with N-type connector and weatherproofing boot, stand-off bracket with clamp collars on a galvanized mast stub and bolted base plate, and a coax drip loop cable-tied down the mast. Material controls: fibreglass radome, stainless ferrule and clamps, galvanized mast, polymer coax. Field-site, marine and high-visibility presets.",
  tags: ['omnidirectional antenna', 'omni antenna', 'collinear', 'whip antenna', 'fibreglass antenna', 'radio', 'telemetry', 'IoT gateway', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const radome = param('radome', '#f1efe6', { label: 'Radome (fibreglass)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Ferrule, bracket and clamps (stainless steel)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Mast stub and base plate (galvanized steel)' });
const polymer = param('polymer', '#22292d', { label: 'Coax, boot and cable ties (black polymer)' });
presets({
  fieldSite: {
    radome: '#e4e2d6',
    stainlessSteel: '#d0d9d6',
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
  },
  marine: {
    radome: '#fbfbf7',
    stainlessSteel: '#e4e9e6',
    galvanizedSteel: '#c9d0d2',
    polymer: '#1f2b33',
  },
  highVisibility: {
    radome: '#f4c21c',
    stainlessSteel: '#e4e9e6',
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
  },
});

const p = assembly("omnidirectional-whip-antenna");
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
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const AX = 260; // antenna axis offset from the mast
const ZB = 700; // top of the base ferrule

// Mast stub on a bolted base plate.
add('base-plate', b(0, 0, 0, 340, 340, 14).color(galvanizedSteel));
for (const x of [-130, 130]) {
  for (const y of [-130, 130]) {
    add(`base-bolt-${x}-${y}`, rod([x, y, 14], [x, y, 40], 14, 6).color(galvanizedSteel));
  }
}
add('mast-socket', turned([[0, 0], [62, 0], [62, 160], [0, 160]]).translate(0, 0, 14).color(galvanizedSteel));
add('mast', turned([[0, 0], [42, 0], [42, 1100], [0, 1100]]).translate(0, 0, 14).color(galvanizedSteel));
add('mast-cap', turned([[0, 0], [46, 0], [46, 12], [0, 22]]).translate(0, 0, 1114).color(polymer));

// Stand-off bracket: two clamp collars on the mast, a flat arm out to two
// collars round the ferrule.
for (const z of [ZB - 260, ZB + 40]) {
  add(`mast-clamp-${z}`, turned([[42, 0], [56, 0], [56, 60], [42, 60]]).translate(0, 0, z).color(stainlessSteel));
  add(`mast-clamp-bolt-${z}`, rod([-30, -60, z + 30], [-30, -90, z + 30], 8, 6).color(stainlessSteel));
}
add('bracket-arm', b(AX / 2 + 10, 0, ZB - 260, AX - 60, 10, 360).color(stainlessSteel));
for (const z of [ZB - 230, ZB - 100]) {
  add(`ferrule-clamp-${z}`, turned([[30, 0], [44, 0], [44, 50], [30, 50]]).translate(AX, 0, z).color(stainlessSteel));
}

// Base ferrule, N-type connector and weatherproofing boot underneath.
add('ferrule', turned([[0, 0], [30, 0], [30, 300], [26, 330], [0, 330]]).translate(AX, 0, ZB - 330).color(stainlessSteel));
add('n-connector', turned([[0, 0], [14, 0], [14, 30], [18, 30], [18, 70], [0, 70]]).rotateX(180).translate(AX, 0, ZB - 330).color(stainlessSteel));
add('boot', turned([[0, 0], [22, 0], [22, 90], [12, 140], [0, 140]]).rotateX(180).translate(AX, 0, ZB - 380).color(polymer));

// Radome: tapered fibreglass tube with decoupling bands and a domed tip.
add('radome-tube', turned([[0, 0], [24, 0], [16, 1560], [0, 1560]]).translate(AX, 0, ZB).color(radome));
add('radome-tip', turned([[0, 0], [16, 0], [14, 20], [8, 34], [0, 38]]).translate(AX, 0, ZB + 1560).color(radome));
for (const [i, t] of [0.33, 0.66].entries()) {
  const r = 24 - 8 * t + 2;
  add(`radome-band-${i}`, turned([[0, 0], [r, 0], [r, 18], [0, 18]]).translate(AX, 0, ZB + 1560 * t).color(stainlessSteel));
}
add('ferrule-collar', turned([[0, 0], [32, 0], [32, 24], [26, 34], [0, 34]]).translate(AX, 0, ZB - 10).color(stainlessSteel));

// Coax drip loop from the boot back to the mast, then cable-tied down it.
const loop = [
  [AX, 0, ZB - 520],
  [AX - 30, -40, ZB - 640],
  [AX - 130, -70, ZB - 670],
  [70, -50, ZB - 560],
  [56, -30, ZB - 420],
];
for (let i = 0; i < loop.length - 1; i += 1) {
  add(`coax-loop-${i}`, rod(loop[i], loop[i + 1], 9, 6).color(polymer));
}
add('coax-down', rod([56, -30, ZB - 420], [56, -30, 200], 9, 6).color(polymer));
add('coax-exit', rod([56, -30, 200], [180, -140, 30], 9, 6).color(polymer));
for (const z of [550, 400, 250]) {
  add(`cable-tie-${z}`, turned([[42, 0], [70, 0], [70, 10], [42, 10]]).translate(0, 0, z).color(polymer));
}

return p.model();
