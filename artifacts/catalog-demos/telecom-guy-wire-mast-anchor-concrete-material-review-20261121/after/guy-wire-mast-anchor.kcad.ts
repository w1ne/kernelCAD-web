// SPDX-License-Identifier: CC0-1.0
// Guyed mast anchor set: a galvanized mast stub on a cast concrete pier, held by three guy wires
// at 120 degrees. Each guy runs from a band at the mast head through a turnbuckle to a galvanized
// anchor rod set in a concrete deadman block, with a yellow guard sleeve on the low end of the wire.

meta({
  name: "guy-wire-mast-anchor",
  license: 'CC0-1.0',
  title: "Guyed mast anchor set",
  description: "Three-point guyed mast set: a galvanized mast stub on a concrete pier, with three galvanized guy wires that run from the mast-head band through turnbuckles to anchor rods set in concrete deadman blocks, and yellow guy guards. Knobs: overall scale; galvanized steel, concrete, guy guard.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Mast, guys, turnbuckles and anchor rods (galvanized steel)' });
const concrete = param('concrete', '#a5a29a', { label: 'Pier and deadman blocks (cast concrete)' });
const guyGuard = param('guyGuard', '#e3b21b', { label: 'Guy guard sleeves (yellow polymer)' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    concrete: '#8c887e',
    guyGuard: '#d9a21a',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    concrete: '#c4c0b5',
    guyGuard: '#f2d21b',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r: number) => {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, 8)
    .rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate(x0, y0, z0).scale(scale);
};

const PIER = 120;       // concrete pier top
const PLATE = 14;       // galvanized base plate
const HEAD = 860;       // guy attachment band centre
const BLOCK = 40;       // deadman block top above grade
const RING = 60;        // guy band radius

const p = assembly("guy-wire-mast-anchor");
p.part("pier", c(0, 0, 0, PIER, 200, 16).color(concrete));
p.part("base-plate", b(0, 0, PIER, 260, 260, PLATE).color(galvanizedSteel));
p.part("mast", c(0, 0, PIER + PLATE, 900 - PIER - PLATE, 45, 12).color(galvanizedSteel));
p.part("mast-cap", c(0, 0, 900, 12, 50, 12).color(galvanizedSteel));
p.part("guy-band", c(0, 0, HEAD - 15, 30, RING, 12).color(galvanizedSteel));

// Anchor points at 120 degrees, 760 mm from the mast.
const anchors: Array<[string, number, number]> = [['a', -660, -380], ['b', 660, -380], ['c', 0, 760]];
for (const [id, ax, ay] of anchors) {
  const dist = Math.hypot(ax, ay);
  const ux = ax / dist, uy = ay / dist;
  // A point on the line from the anchor-rod foot (t = 0) to the guy band (t = 1).
  const at = (t: number): [number, number, number] => {
    const rLen = dist + (RING - dist) * t;
    return [ux * rLen, uy * rLen, BLOCK + (HEAD - BLOCK) * t];
  };
  const seg = (t0: number, t1: number, r: number) => span(...at(t0), ...at(t1), r);

  p.part(`deadman-${id}`, b(ax, ay, 0, 240, 240, BLOCK).color(concrete));
  p.part(`anchor-rod-${id}`, seg(0, 0.1, 9).color(galvanizedSteel));
  p.part(`turnbuckle-${id}`, seg(0.1, 0.22, 15).color(galvanizedSteel));
  p.part(`guy-${id}`, seg(0.22, 1, 6).color(galvanizedSteel));
  p.part(`guy-guard-${id}`, seg(0.24, 0.62, 16).color(guyGuard));
}

return p.model();
