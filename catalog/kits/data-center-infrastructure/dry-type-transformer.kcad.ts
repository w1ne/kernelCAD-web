// SPDX-License-Identifier: CC0-1.0
// Dry-type transformer: an open cast-resin distribution transformer as it
// stands inside a data-centre unit substation. What makes it one: three
// round cast-resin coils threaded over the three legs of a laminated steel
// core, the core yokes gripped top and bottom by bolted clamping channels,
// copper delta links and tap links across the coil fronts, porcelain-style
// post insulators carrying the HV terminals, flat copper LV busbars rising at
// the back, lifting lugs on top, and the whole set on a wheeled base.
// Millimetres, Z up, the HV tap face looks at -Y.
meta({
  name: "dry-type-transformer",
  license: 'CC0-1.0',
  title: "Dry-type transformer",
  description: "Open three-phase cast-resin dry-type transformer: three turned resin coils with inner LV windings and spacer blocks over a three-leg laminated core, bolted top and bottom clamping channels, copper delta links and tap-changer studs on the coil fronts, HV post insulators and terminals, flat copper LV busbars, lifting lugs, and a channel base on flanged wheels. Material controls: coil resin, core steel, clamp frame, copper and insulators; castResinRed, utilityBlue and weathered presets.",
  tags: ['data center', 'power', 'transformer', 'cast resin', 'dry type', 'substation', 'electrical', 'critical infrastructure', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const resin = param('resin', '#7d93a3', { label: 'Cast-resin coils' });
const coreSteel = param('coreSteel', '#33373a', { label: 'Laminated core steel' });
const frame = param('frame', '#8b99a3', { label: 'Clamp frame and base paint' });
const copper = param('copper', '#c37a3d', { label: 'Copper links and busbars' });
const insulator = param('insulator', '#d9d1bd', { label: 'Insulators and spacers' });

presets({
  castResinRed: { resin: '#8c3b2b', frame: '#7c8a91', insulator: '#e2d9c3' },
  utilityBlue: { resin: '#3f5f80', frame: '#c8ccc8', insulator: '#b8452f' },
  weathered: { resin: '#5e6061', coreSteel: '#4a4540', frame: '#7e7f78', copper: '#8f6a45', insulator: '#bdb39c' },
});

const p = assembly("dry-type-transformer");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Turned part with its axis along +X / along -Y.
const alongX = (shape) => shape.rotateY(90);
const facingFront = (shape) => shape.rotateX(90);

const legs = [-580, 0, 580];
const coil0 = 600, coil1 = 1440;

// ---- Wheeled channel base ----
for (const y of [-260, 260]) {
  add(`base-channel-${y}`, blk(-900, y - 60, 140, 900, y + 60, 260).color(frame));
  for (const x of [-700, 700]) {
    add(`wheel-${x}-${y}`, facingFront(turned([[0, -30], [70, -30], [70, -20], [80, -15], [80, 15], [70, 20], [70, 30], [0, 30]])).translate(x, y, 80).color(coreSteel));
    add(`wheel-bracket-${x}-${y}`, blk(x - 60, y - 45, 80, x + 60, y + 45, 140).color(frame));
  }
}

// ---- Laminated three-leg core: legs, yokes, stepped lamination edges ----
add('yoke-bottom', blk(-830, -130, 300, 830, 130, 560).color(coreSteel));
add('yoke-top', blk(-830, -130, 1480, 830, 130, 1740).color(coreSteel));
for (const x of legs) {
  add(`leg-${x}`, blk(x - 120, -120, 560, x + 120, 120, 1480).color(coreSteel));
}
for (const [z0, z1] of [[300, 560], [1480, 1740]]) {
  add(`yoke-step-${z0}`, blk(-830, -150, z0 + 40, 830, 150, z1 - 40).color(coreSteel));
}

// ---- Clamping channels, tie rods and lifting lugs ----
for (const [z0, z1] of [[260, 600], [1440, 1780]]) {
  for (const y of [-1, 1]) {
    add(`clamp-${z0}-${y}`, blk(-880, y * 150, z0, 880, y * 200, z1).color(frame));
    add(`clamp-lip-top-${z0}-${y}`, blk(-880, y * 150, z1 - 30, 880, y * 245, z1).color(frame));
    add(`clamp-lip-bottom-${z0}-${y}`, blk(-880, y * 150, z0, 880, y * 245, z0 + 30).color(frame));
  }
  for (const x of [-860, 860]) {
    add(`clamp-bolt-${z0}-${x}`, facingFront(rod(18, -270, 270)).translate(x, 0, (z0 + z1) / 2).color(copper));
  }
}
for (const x of [-860, 860]) {
  for (const y of [-180, 180]) {
    add(`tie-rod-${x}-${y}`, rod(16, 600, 1440).translate(x, y, 0).color(frame));
  }
  add(`lifting-lug-${x}`, facingFront(extrudePolygon([[-70, 0], [70, 0], [40, 140], [-40, 140]], 30)).translate(x, 15, 1780).color(frame));
  add(`lug-eye-${x}`, facingFront(ring(22, 34, -1, 31)).translate(x, 15, 1870).color(coreSteel));
}

// ---- Three cast-resin coils with LV windings and spacer blocks ----
legs.forEach((x, i) => {
  add(`hv-coil-${i}`, turned([[205, coil0], [265, coil0], [278, coil0 + 30], [278, coil1 - 30], [265, coil1], [205, coil1]]).translate(x, 0, 0).color(resin));
  add(`lv-coil-${i}`, ring(140, 190, coil0 - 20, coil1 + 20).translate(x, 0, 0).color(resin));
  add(`lv-duct-${i}`, ring(190, 205, coil0 + 10, coil1 - 10).translate(x, 0, 0).color(coreSteel));
  for (const t of [45, 135, 225, 315]) {
    const a = (t * Math.PI) / 180;
    add(`spacer-low-${i}-${t}`, blk(-28, -28, coil0 - 40, 28, 28, coil0).rotateZ(t).translate(x + 235 * Math.cos(a), 235 * Math.sin(a), 0).color(insulator));
    add(`spacer-high-${i}-${t}`, blk(-28, -28, coil1, 28, 28, coil1 + 40).rotateZ(t).translate(x + 235 * Math.cos(a), 235 * Math.sin(a), 0).color(insulator));
  }
  // Tap-changer panel on the coil front: six studs and a link.
  add(`tap-boss-${i}`, blk(x - 70, -296, 940, x + 70, -270, 1100).color(resin));
  for (let k = 0; k < 6; k++) {
    add(`tap-stud-${i}-${k}`, facingFront(rod(10, 0, 26)).translate(x - 45 + 30 * (k % 4), -296, 970 + 100 * Math.floor(k / 4)).color(copper));
  }
  add(`tap-link-${i}`, blk(x - 55, -312, 960, x + 5, -300, 980).color(copper));
  // HV terminal boss and delta-link stub at the top front.
  add(`hv-boss-${i}`, facingFront(rod(28, 0, 30)).translate(x, -275, 1360).color(copper));
});

// Delta links across the coil fronts (copper rods along X).
add('delta-link-top', alongX(rod(14, -600, 600)).translate(0, -330, 1360).color(copper));
for (const x of legs) {
  add(`delta-drop-${x}`, blk(x - 12, -340, 1360, x + 12, -290, 1374).color(copper));
}
add('delta-link-bottom', alongX(rod(14, -600, 600)).translate(0, -330, 700).color(copper));
for (const x of legs) {
  add(`delta-boss-low-${x}`, facingFront(rod(24, 0, 60)).translate(x, -275, 700).color(copper));
}

// ---- HV post insulators with terminals on the top clamp ----
legs.forEach((x, i) => {
  add(`hv-insulator-${i}`, turned([[0, 0], [48, 0], [48, 20], [30, 30], [44, 50], [28, 70], [44, 90], [28, 110], [40, 130], [26, 150], [0, 150]]).translate(x, -215, 1780).color(insulator));
  add(`hv-terminal-${i}`, turned([[0, 1930], [22, 1930], [22, 1990], [32, 1990], [32, 2010], [0, 2010]]).translate(x, -215, 0).color(copper));
});

// ---- Flat copper LV busbars rising at the back ----
[-700, -360, 360, 700].forEach((x, i) => {
  add(`lv-bus-${i}`, blk(x - 40, 262, 1440, x + 40, 274, 2050).color(copper));
  add(`lv-bus-palm-${i}`, blk(x - 50, 252, 1960, x + 50, 284, 2060).color(copper));
  add(`lv-standoff-${i}`, facingFront(rod(26, -40, 0)).translate(x, 222, 1640).color(insulator));
});

return p.model();
