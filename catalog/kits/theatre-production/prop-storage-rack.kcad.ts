// SPDX-License-Identifier: CC0-1.0
// Prop storage rack: a rolling wire shelving unit backstage, loaded with the
// show's hand props and labelled by scene so the props crew can preset it.
// What makes it a prop rack rather than a stack of shelves: four round
// posts with split-sleeve collars, open wire shelf mats with perimeter
// frames, gaffer-tape scene labels on the front of each shelf, swivel
// casters with brakes, and recognisable props on every tier: a wooden crate
// and a domed travel trunk below, a teapot, candlestick and a stack of
// books in the middle, hat boxes and a lantern on top.
// Generic visualization geometry at about real size (1.2 m wide, 1.85 m
// tall), millimetres, Z up, front toward -Y, caster wheels on z = 0.

meta({
  name: "prop-storage-rack",
  license: 'CC0-1.0',
  title: "Prop storage rack",
  description: "Rolling backstage prop shelving at about real size: four round posts with collars, three open wire shelf mats with perimeter frames, gaffer-tape scene labels, four swivel casters with brakes, and props on each tier: a slatted wooden crate and a domed travel trunk, a turned teapot, brass candlestick and a stack of books, two hat boxes and a lantern. Material controls: rack wire, prop timber, prop fabric and leather, label tape. houseShow, touring and periodDrama presets.",
  tags: ['prop rack', 'prop shelf', 'prop table', 'wire shelving', 'backstage storage', 'hand props', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 6500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const wire = param('wire', '#c3c9cc', { label: 'Rack wire and posts' });
const timber = param('timber', '#a4763f', { label: 'Prop timber' });
const fabric = param('fabric', '#6d2a3a', { label: 'Prop fabric and leather' });
const tape = param('tape', '#f2efe4', { label: 'Label tape' });

presets({
  houseShow: { wire: '#c3c9cc', timber: '#a4763f', fabric: '#6d2a3a', tape: '#f2efe4' },
  touring: { wire: '#2c3034', timber: '#7d5a36', fabric: '#2f4f6e', tape: '#f0c419' },
  periodDrama: { wire: '#8d969b', timber: '#5e3d22', fabric: '#3f5a34', tape: '#e6d9b8' },
});

const RUBBER = '#18191b';
const BRASS = '#c9a241';
const CHINA = '#e9eef0';
const INK = '#26292c';

const p = assembly("prop-storage-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (len: number, r: number, n = 8) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 8) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

// Revolve an (r, z) profile about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 1200;
const D = 600;
const Z0 = 130; // post foot
const TOP = 1850;
const PX = W / 2 - 15;
const PY = D / 2 - 15;
const SHELVES: [string, number][] = [["low", 260], ["mid", 860], ["high", 1460]];

// Posts with collars, caster stems and swivel casters.
for (const x of [-PX, PX])
  for (const y of [-PY, PY]) {
    const id = `${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`;
    add(`post-${id}`, cylinder(TOP - Z0, 13, 12).translate(x, y, Z0).color(wire));
    add(`post-cap-${id}`, sphere(15).translate(x, y, TOP).color(RUBBER));
    add(`caster-plate-${id}`, cylinder(12, 32, 12).translate(x, y, Z0 - 12).color(wire));
    add(`caster-fork-${id}`, blk(x + 16, y, 50, 18, 46, Z0 - 62).color(wire));
    add(`caster-wheel-${id}`, alongY(32, 50, 16).translate(x + 16, y + 16, 48).subtract(box(140, 140, 20, true).translate(x + 16, y, -10)).color(RUBBER));
    if (y < 0) add(`caster-brake-${id}`, blk(x + 16, y - 40, 92, 40, 40, 10).color('#c23b2a'));
  }

// Wire shelves: perimeter frame, front and back truss wires, cross wires, collars.
for (const [s, z] of SHELVES) {
  for (const y of [-PY, PY]) {
    add(`shelf-${s}-rail-${y < 0 ? 'f' : 'b'}`, alongX(W - 30, 6).translate(-PX, y, z + 30).color(wire));
    add(`shelf-${s}-truss-${y < 0 ? 'f' : 'b'}`, alongX(W - 30, 4).translate(-PX, y, z).color(wire));
  }
  for (const x of [-PX, PX]) add(`shelf-${s}-end-${x < 0 ? 'l' : 'r'}`, alongY(D - 30, 6).translate(x, PY, z + 30).color(wire));
  for (let k = 1; k < 12; k++) add(`shelf-${s}-wire-${k}`, alongY(D - 30, 3, 6).translate(-PX + (k * (W - 30)) / 12, PY, z + 30).color(wire));
  for (const y of [-PY + 150, 0, PY - 150]) add(`shelf-${s}-bar-${y}`, alongX(W - 30, 3, 6).translate(-PX, y, z + 26).color(wire));
  for (const x of [-PX, PX])
    for (const y of [-PY, PY]) add(`shelf-${s}-collar-${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`, cylinder(45, 18, 12).translate(x, y, z - 10).color(wire));
  // Gaffer tape label with written scene number.
  add(`label-${s}`, blk(-300, -PY - 8, z + 6, 260, 4, 44).color(tape));
  add(`label-${s}-ink`, blk(-320, -PY - 11, z + 22, 160, 2, 10).color(INK));
}

const S1 = 260 + 36; // shelf deck tops
const S2 = 860 + 36;
const S3 = 1460 + 36;

// Low shelf: slatted crate and a domed trunk.
add("crate-base", blk(-310, 0, S1, 460, 400, 20).color(timber));
for (let k = 0; k < 4; k++) add(`crate-slat-front-${k}`, blk(-310, -195, S1 + 20 + k * 85, 460, 14, 60).color(timber));
for (let k = 0; k < 4; k++) add(`crate-slat-side-${k}`, blk(-535, 0, S1 + 20 + k * 85, 14, 400, 60).color(timber));
for (const x of [-530, -90]) add(`crate-post-${x < -300 ? 'l' : 'r'}`, blk(x, -190, S1 + 20, 30, 30, 340).color('#7a5530'));
add("crate-back", blk(-310, 190, S1 + 20, 460, 14, 340).color(timber));
add("crate-side-r", blk(-85, 0, S1 + 20, 14, 400, 340).color(timber));
add("crate-straw", blk(-310, 0, S1 + 300, 420, 360, 50).color('#d8bd6a'));
add("trunk-body", blk(290, 20, S1, 500, 340, 260).color(fabric));
add("trunk-lid", alongX(500, 170, 16).subtract(box(520, 400, 200, true).translate(250, 0, -100)).translate(40, 20, S1 + 260).color(fabric));
for (const x of [100, 480]) add(`trunk-band-${x}`, blk(x, 20, S1, 40, 350, 270).color(timber));
add("trunk-hasp", blk(290, -158, S1 + 200, 50, 12, 80).color(BRASS));
for (const x of [65, 515]) add(`trunk-corner-${x}`, blk(x, -155, S1, 50, 10, 50).color(BRASS));

// Mid shelf: teapot, candlestick, stack of books.
add("teapot-body", turned([[0, 0], [60, 0], [95, 50], [90, 110], [55, 150], [0, 150]]).translate(-380, -40, S2).color(CHINA));
add("teapot-lid-knob", sphere(18).translate(-380, -40, S2 + 160).color(CHINA));
add("teapot-spout", cylinder(110, 13, 8).rotateY(-50).translate(-460, -40, S2 + 60).color(CHINA));
add("teapot-handle", torus(45, 10, 12).rotateX(90).translate(-280, -40, S2 + 80).color(CHINA));
add("teapot-band", cylinder(14, 93, 16).translate(-380, -40, S2 + 70).color(fabric));
add("candlestick", turned([[0, 0], [70, 0], [70, 14], [24, 30], [16, 120], [26, 200], [14, 260], [34, 290], [34, 300], [0, 300]]).translate(-90, -60, S2).color(BRASS));
add("candle", cylinder(160, 13, 10).translate(-90, -60, S2 + 300).color('#f4efdc'));
add("flame", sphere(10).scale([1, 1, 1.8]).translate(-90, -60, S2 + 475).color('#f2a33a'));
const books: [number, number, number, string][] = [[300, 220, 50, '#2f4f6e'], [280, 200, 40, '#7d2b2b'], [260, 210, 60, '#3f5a34'], [240, 180, 35, '#d1a043']];
let bz = S2;
books.forEach(([w, d, h, c], i) => {
  add(`book-${i}`, box(w, d, h, true).rotateZ(i * 7 - 10).translate(260, -40, bz + h / 2).color(c));
  add(`book-${i}-pages`, box(w - 20, 4, h - 10, true).rotateZ(i * 7 - 10).translate(260, -40 - d / 2, bz + h / 2).color(tape));
  bz += h;
});

// High shelf: two hat boxes and a lantern.
add("hatbox-a", cylinder(200, 170, 20).translate(-300, 20, S3).color(fabric));
add("hatbox-a-lid", cylinder(40, 178, 20).translate(-300, 20, S3 + 180).color(tape));
add("hatbox-b", cylinder(150, 120, 18).translate(-300, 0, S3 + 220).color('#d8b46a'));
add("hatbox-b-lid", cylinder(30, 126, 18).translate(-300, 0, S3 + 355).color(fabric));
add("hatbox-ribbon", blk(-300, -128, S3 + 230, 30, 8, 140).color(tape));
add("lantern-base", blk(250, -40, S3, 170, 170, 30).color(INK));
for (const dx of [-75, 75])
  for (const dy of [-75, 75]) add(`lantern-post-${dx}-${dy}`, blk(250 + dx, -40 + dy, S3 + 30, 16, 16, 220).color(INK));
add("lantern-glass", blk(250, -40, S3 + 30, 140, 140, 220).color('#f2c46a'));
add("lantern-roof", turned([[0, 0], [110, 0], [0, 90]]).translate(250, -40, S3 + 250).color(INK));
add("lantern-ring", torus(32, 6, 12).rotateX(90).translate(250, -40, S3 + 360).color(INK));

return p.model();
