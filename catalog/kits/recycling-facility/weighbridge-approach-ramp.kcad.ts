// SPDX-License-Identifier: CC0-1.0
// Weighbridge approach ramp: the steel ramp module that lifts a truck from
// ground level up onto a surface-mounted weighbridge deck. What makes it a
// ramp rather than a block: a sloped tread plate rising from a hazard-striped
// toe nose to the deck height, triangular side cheeks and internal ribs
// carrying the plate, raised anti-slip bars across the slope, low yellow guide
// kerbs that taper in at the toe, bolted foot flanges anchoring the cheeks to
// a concrete apron, and a rubber gap seal where the ramp meets the deck.
// Generic visualization geometry at about real size (3 m wide, 3 m long,
// rising to 620 mm), millimetres, Z up, trucks drive toward +X.

meta({
  name: "weighbridge-approach-ramp",
  license: 'CC0-1.0',
  title: "Weighbridge approach ramp",
  description: "Steel approach ramp for a surface-mounted weighbridge at about real size: 3 m wide sloped tread plate rising to 620 mm, triangular side cheeks and ribs, anti-slip bars across the slope, tapered yellow guide kerbs, hazard-striped toe nose, bolted foot flanges on a concrete apron and a rubber gap seal at the deck end. Optional guide kerbs. Material controls: ramp steel, guide kerbs, anti-slip bars and concrete. blueSteel, galvanised and weathered presets.",
  tags: ["weighbridge", "approach ramp", "truck scale", "vehicle ramp", "recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const rampSteel = param('rampSteel', '#2f5f86', { label: 'Ramp plate and cheeks (painted steel)' });
const kerb = param('kerb', '#f0c419', { label: 'Guide kerbs (safety yellow)' });
const tread = param('tread', '#3a4650', { label: 'Anti-slip bars' });
const concrete = param('concrete', '#9a9b94', { label: 'Concrete apron' });
const kerbs = param('kerbs', true, { label: 'Guide kerbs' });

presets({
  blueSteel: { rampSteel: '#2f5f86', kerb: '#f0c419', tread: '#3a4650', concrete: '#9a9b94' },
  galvanised: { rampSteel: '#a7adaa', kerb: '#e8b41c', tread: '#6c7275', concrete: '#9a9b94' },
  weathered: { rampSteel: '#5b5246', kerb: '#b99a3a', tread: '#3b3833', concrete: '#86857c' },
});

const p = assembly("weighbridge-approach-ramp");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Side outline [[x, z], ...] extruded across Y from y0 to y1.
const prismY = (pts: number[][], y0: number, y1: number) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);

const L = 3000;
const W = 3000;
const XT = -L / 2; // toe
const XH = L / 2; // head, at the deck
const ZT = 40;
const ZH = 620;
const zs = (x: number) => ZT + ((x - XT) / L) * (ZH - ZT);
const slope = (Math.atan2(ZH - ZT, L) * 180) / Math.PI;

// Concrete apron the ramp is bolted to.
add("apron", blk(-250, 0, 0, L + 900, W + 500, 30).color(concrete));
add("apron-edge", blk(XT - 700, 0, 30, 100, W + 500, 10).color('#7c7d77'));

// Tread plate: a sloped slab of constant thickness.
add("tread-plate", prismY([[XT, ZT - 20], [XH, ZH - 20], [XH, ZH], [XT, ZT]], -W / 2, W / 2).color(rampSteel));
// Side cheeks and internal ribs: triangles under the plate.
const cheek = [[XT + 40, 30], [XH, 30], [XH, ZH - 20], [XT + 40, zs(XT + 40) - 20]];
add("cheek-l", prismY(cheek, -W / 2, -W / 2 + 16).color(rampSteel));
add("cheek-r", prismY(cheek, W / 2 - 16, W / 2).color(rampSteel));
for (const [i, y] of [[0, -500], [1, 500]] as const) add(`rib-${i}`, prismY(cheek, y - 8, y + 8).color(rampSteel));
add("head-plate", blk(XH - 8, 0, 30, 16, W, ZH - 50).color(rampSteel));
add("base-bar", blk(0, 0, 0, L - 80, W, 30).color('#4a4f53'));

// Lightening holes along the visible cheek.
for (let k = 0; k < 3; k++) {
  const x = XT + 1200 + k * 520;
  const r = 50 + k * 30;
  add(`cheek-hole-${k}`, cylinder(6, r, 14).rotateX(90).translate(x, -W / 2 - 1, 30 + (zs(x) - 30) / 2 - 10).color('#1f2224'));
}

// Toe nose with hazard stripes.
add("toe-nose", blk(XT - 40, 0, 0, 80, W, ZT).color(rampSteel));
for (let k = 0; k < 10; k++) add(`toe-stripe-${k}`, blk(XT - 82, -W / 2 + 150 + k * 300, 0, 6, 300, ZT).color(k % 2 ? '#1b1c1d' : kerb));

// Anti-slip bars across the slope.
for (let k = 0; k < 9; k++) {
  const x = XT + 250 + k * 320;
  add(`bar-${k}`, box(50, W - 420, 10, true).translate(0, 0, 5).rotateY(-slope).translate(x, 0, zs(x)).color(tread));
}

// Guide kerbs: low yellow strips following the slope, tapered in at the toe.
if (kerbs.value) {
  for (const [s, side] of [[-1, 'l'], [1, 'r']] as const) {
    const y0 = s < 0 ? -W / 2 : W / 2 - 120;
    add(`kerb-${side}`, prismY([[XT + 200, zs(XT + 200)], [XH, ZH], [XH, ZH + 150], [XT + 800, zs(XT + 800) + 150]], y0, y0 + 120).color(kerb));
    add(`kerb-cap-${side}`, prismY([[XT + 800, zs(XT + 800) + 150], [XH, ZH + 150], [XH, ZH + 162], [XT + 800, zs(XT + 800) + 162]], y0 + 10, y0 + 110).color('#1b1c1d'));
  }
}

// Bolted foot flanges along the lane-side cheek and the toe.
for (let k = 0; k < 4; k++) {
  const x = XT + 300 + k * 800;
  add(`foot-${k}`, blk(x, -W / 2 - 60, 30, 200, 120, 14).color(rampSteel));
  for (const dx of [-60, 60]) add(`bolt-${k}-${dx < 0 ? 'a' : 'b'}`, cylinder(20, 16, 6).translate(x + dx, -W / 2 - 80, 44).color('#c3c9cb'));
}

// Rubber gap seal and lifting eyes at the deck end.
add("gap-seal", blk(XH + 15, 0, ZH - 40, 30, W, 40).color('#1b1c1d'));
for (const [i, y] of [[0, -900], [1, 900]] as const) {
  add(`lift-eye-${i}`, torus(40, 10, 10).rotateX(90).translate(XH - 120, y, ZH + 20).color('#c3c9cb'));
}

return p.model();
