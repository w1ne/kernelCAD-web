// SPDX-License-Identifier: CC0-1.0
// Telecom equipment shelter: the prefabricated walk-in hut at the foot of a
// tower that keeps radios, batteries and transmission kit dry and cool.
// What makes it a shelter rather than a shed: it stands on a galvanized skid
// frame over footing piers, its walls are ribbed composite panels, a single
// steel door has a rain hood, light and a grated landing with steps, two
// wall-mounted air conditioners hang on the side, an exhaust louvre sits high
// on the opposite wall, and a waveguide entry plate with cable boots feeds
// coax off a cable bridge that runs out towards the tower.
// Generic visualization geometry at real size (3.0 x 2.4 m footprint, 3.2 m to
// the roof ridge), millimetres, Z up, door facing -Y, ground on z = 0.

meta({
  name: "telecom-equipment-shelter",
  license: 'CC0-1.0',
  title: "Telecom equipment shelter",
  description: "Prefabricated walk-in telecom shelter: galvanized skid frame on footing piers, ribbed composite wall panels, low gabled roof with drip edge, steel door with rain hood, light and grated landing with steps, two wall-mounted air conditioners with condenser fan guards, high exhaust louvre, waveguide entry plate with cable boots and a cable bridge running towards the tower. Material controls: wall panels, powder-coated door, roof and trim, galvanized steel, air-conditioner casing, polymer cables and seals. Field-site and high-visibility presets.",
  tags: ['equipment shelter', 'telecom shelter', 'BTS shelter', 'cell site', 'hut', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cableBridge = param('cableBridge', 'fitted', { choices: ['fitted', 'none'], label: 'Cable bridge to tower' });

const wallPanel = param('wallPanel', '#d9d2bd', { label: 'Wall panels (composite)' });
const powderCoat = param('powderCoat', '#5f7b80', { label: 'Door, roof and trim (powder-coated steel)' });
const galvanizedSteel = param('galvanizedSteel', '#8a979c', { label: 'Skid, piers, landing and cable bridge (galvanized steel)' });
const hvacCasing = param('hvacCasing', '#eceee8', { label: 'Air-conditioner casing' });
const polymer = param('polymer', '#22292d', { label: 'Cables, boots, grilles and seals (black polymer)' });
presets({
  fieldSite: {
    wallPanel: '#a9b29a',
    powderCoat: '#52756b',
    galvanizedSteel: '#8f9b9b',
    hvacCasing: '#d6dbd2',
    polymer: '#263a37',
  },
  highVisibility: {
    wallPanel: '#eeeae0',
    powderCoat: '#e0aa18',
    galvanizedSteel: '#3a4b51',
    hvacCasing: '#f4f4ef',
    polymer: '#27363c',
  },
});

const p = assembly("telecom-equipment-shelter");
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
// Prism along X from a [y, z] cross-section.
const prismX = (pts, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(-len / 2, 0, 0);

const W = 3000;
const D = 2400;
const ZF = 450; // floor level on top of the skid
const H = 2550;
const ZT = ZF + H;

// Footing piers and the galvanized skid frame.
for (const x of [-W / 2 + 150, 0, W / 2 - 150]) {
  for (const y of [-D / 2 + 150, D / 2 - 150]) {
    add(`pier-${x}-${y}`, b(x, y, 0, 360, 360, 250).color(galvanizedSteel));
  }
}
add('skid-front', b(0, -D / 2 + 60, 250, W + 40, 120, ZF - 250).color(galvanizedSteel));
add('skid-back', b(0, D / 2 - 60, 250, W + 40, 120, ZF - 250).color(galvanizedSteel));
add('skid-left', b(-W / 2 + 60, 0, 250, 120, D - 240, ZF - 250).color(galvanizedSteel));
add('skid-right', b(W / 2 - 60, 0, 250, 120, D - 240, ZF - 250).color(galvanizedSteel));

// Walls with vertical panel ribs on every face and a base trim.
add('walls', b(0, 0, ZF, W, D, H).color(wallPanel));
add('base-trim', b(0, 0, ZF, W + 30, D + 30, 120).color(powderCoat));
for (let i = 1; i < 5; i += 1) {
  const x = -W / 2 + (i * W) / 5;
  if (Math.abs(x + 700) > 600) add(`rib-front-${i}`, b(x, -D / 2 - 12, ZF + 120, 70, 24, H - 120).color(wallPanel));
  add(`rib-back-${i}`, b(x, D / 2 + 12, ZF + 120, 70, 24, H - 120).color(wallPanel));
}
for (let i = 1; i < 4; i += 1) {
  const y = -D / 2 + (i * D) / 4;
  add(`rib-left-${i}`, b(-W / 2 - 12, y, ZF + 120, 24, 70, H - 120).color(wallPanel));
  add(`rib-right-${i}`, b(W / 2 + 12, y, ZF + 120, 24, 70, H - 120).color(wallPanel));
}

// Low gabled roof with a drip edge all round.
add('roof', prismX([[-D / 2 - 160, ZT], [D / 2 + 160, ZT], [D / 2 + 160, ZT + 90], [0, ZT + 230], [-D / 2 - 160, ZT + 90]], W + 320).color(powderCoat));
add('fascia-front', b(0, -D / 2 - 160, ZT - 60, W + 320, 24, 150).color(powderCoat));
add('fascia-back', b(0, D / 2 + 160, ZT - 60, W + 320, 24, 150).color(powderCoat));

// Door: frame, leaf, kick plate, lever handle, rain hood and light.
const DX = -700;
const FY = -D / 2;
add('door-frame', b(DX, FY - 20, ZF + 60, 1080, 40, 2240).color(galvanizedSteel));
add('door-leaf', b(DX, FY - 45, ZF + 100, 960, 30, 2150).color(powderCoat));
add('kick-plate', b(DX, FY - 64, ZF + 110, 900, 8, 260).color(galvanizedSteel));
add('door-lever', b(DX + 350, FY - 95, ZF + 1050, 160, 30, 30).color(galvanizedSteel));
add('door-lock', rod([DX + 380, FY - 60, ZF + 1180], [DX + 380, FY - 86, ZF + 1180], 22, 8).color(galvanizedSteel));
for (const z of [ZF + 300, ZF + 1150, ZF + 2000]) {
  add(`door-hinge-${z}`, rod([DX - 470, FY - 66, z], [DX - 470, FY - 66, z + 120], 18, 8).color(galvanizedSteel));
}
add('rain-hood', prismX([[0, 0], [-420, 0], [0, 180]], 1300).translate(DX, FY, ZF + 2330).color(powderCoat));
add('door-light', b(DX + 700, FY - 70, ZF + 2200, 220, 140, 140).color(hvacCasing));
add('door-light-lens', b(DX + 700, FY - 142, ZF + 2210, 160, 6, 100).color(polymer));

// Grated landing with steps in front of the door.
add('landing', b(DX, FY - 450, ZF - 60, 1300, 860, 60).color(galvanizedSteel));
for (const x of [DX - 600, DX + 600]) {
  add(`landing-leg-${x}`, b(x, FY - 820, 0, 60, 60, ZF - 60).color(galvanizedSteel));
}
for (let i = 0; i < 2; i += 1) {
  add(`step-${i}`, b(DX, FY - 960 - i * 260, ZF - 210 - i * 150, 1100, 260, 40).color(galvanizedSteel));
}
for (const x of [DX - 570, DX + 570]) {
  add(`stringer-${x}`, rod([x, FY - 870, ZF - 60], [x, FY - 1380, 40], 28, 4).color(galvanizedSteel));
}

// Two wall-mounted air conditioners on the left wall, each with a condenser
// grille and a fan guard on its outer face.
const AX = -W / 2 - 24;
for (const [i, y] of [[0, -560], [1, 560]]) {
  add(`ac-${i}-body`, b(AX - 170, y, ZF + 500, 340, 900, 1700).color(hvacCasing));
  add(`ac-${i}-hood`, prismX([[-470, 0], [470, 0], [470, 40], [-470, 80]], 400).translate(AX - 170, y, ZF + 2200).color(hvacCasing));
  for (let k = 0; k < 8; k += 1) {
    add(`ac-${i}-slat-${k}`, b(AX - 344, y, ZF + 600 + k * 70, 10, 760, 22).color(polymer));
  }
  const fz = ZF + 1650;
  add(`ac-${i}-fan-ring`, path().moveTo(270, -10).lineTo(300, -10).lineTo(300, 20).lineTo(270, 20).close().revolve()
    .rotateY(90).translate(AX - 340, y, fz).color(polymer));
  add(`ac-${i}-fan-hub`, rod([AX - 340, y, fz], [AX - 370, y, fz], 70, 10).color(polymer));
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 4;
    add(`ac-${i}-guard-${k}`, rod([AX - 362, y - 285 * Math.cos(a), fz - 285 * Math.sin(a)], [AX - 362, y + 285 * Math.cos(a), fz + 285 * Math.sin(a)], 6, 4).color(polymer));
  }
  add(`ac-${i}-condensate`, rod([AX - 60, y + 300, ZF + 500], [AX - 60, y + 300, ZF - 120], 12, 6).color(polymer));
}

// High exhaust louvre on the right wall.
add('exhaust-frame', b(W / 2 + 30, 300, ZF + 1800, 30, 700, 500).color(powderCoat));
for (let k = 0; k < 6; k += 1) {
  add(`exhaust-blade-${k}`, box(80, 640, 10, true).rotateY(40).translate(W / 2 + 70, 300, ZF + 1850 + k * 75).color(polymer));
}

// Waveguide entry plate with cable boots on the back wall, and a cable
// bridge running from it towards the tower with coax laid on the rungs.
const EZ = ZF + 2000;
add('entry-plate', b(700, D / 2 + 30, EZ - 250, 700, 40, 500).color(galvanizedSteel));
const bootXs = [480, 620, 760, 900];
for (const x of bootXs) {
  for (const z of [EZ - 120, EZ + 80]) {
    add(`boot-${x}-${z}`, rod([x, D / 2 + 50, z], [x, D / 2 + 140, z], 36, 8).color(polymer));
  }
}
if (cableBridge.value === 'fitted') {
  const L = 2600;
  const BZ = EZ + 260;
  for (const x of [400, 1000]) {
    add(`bridge-rail-${x}`, b(x, D / 2 + L / 2, BZ, 60, L, 120).color(galvanizedSteel));
  }
  for (let k = 0; k < 9; k += 1) {
    add(`bridge-rung-${k}`, b(700, D / 2 + 200 + k * 290, BZ + 40, 600, 40, 30).color(galvanizedSteel));
  }
  add('bridge-post', rod([700, D / 2 + L - 100, 0], [700, D / 2 + L - 100, BZ], 60, 8).color(galvanizedSteel));
  add('bridge-crossarm', b(700, D / 2 + L - 100, BZ - 80, 700, 80, 80).color(galvanizedSteel));
  add('bridge-post-foot', b(700, D / 2 + L - 100, 0, 300, 300, 40).color(galvanizedSteel));
  for (const [i, x] of bootXs.entries()) {
    add(`coax-run-${i}`, rod([x, D / 2 + 200, BZ + 100], [x, D / 2 + L, BZ + 100], 22, 6).color(polymer));
    add(`coax-drop-${i}`, rod([x, D / 2 + 140, EZ + 80], [x, D / 2 + 200, BZ + 100], 22, 6).color(polymer));
  }
}

// Roof-mounted GPS timing antenna.
add('gps-mast', rod([1100, -400, ZT + 160], [1100, -400, ZT + 520], 20, 6).color(galvanizedSteel));
add('gps-puck', path().moveTo(0, 0).lineTo(70, 0).lineTo(70, 40).lineTo(40, 80).lineTo(0, 90).close().revolve().translate(1100, -400, ZT + 520).color(hvacCasing));

return p.model();
