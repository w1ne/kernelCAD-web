// SPDX-License-Identifier: CC0-1.0
// Queen introduction cage: the three-hole wooden Benton mailing cage a mated
// queen arrives in and is hung between frames in so the colony can accept
// her.
// What makes it a Benton cage rather than a wooden block: a small hardwood
// block with three round chambers drilled side by side into its face, wire
// screen stapled over them so the bees can be fed through it, a cork plug in
// each end, one end chamber packed with white queen candy (the bees eat
// through it to release her), and a tin strap stapled to the end for hanging
// it between two frames. Inside, the queen with her year-colour paint dot on
// the thorax and a few attendant workers.
// Generic visualization geometry at real size (89 x 25 x 16 mm), millimetres,
// Z up, lying screen-up on z = 0, long axis along X.

meta({
  name: "queen-cage",
  license: 'CC0-1.0',
  title: "Queen introduction cage",
  description: "Three-hole wooden Benton queen cage: hardwood block with three drilled chambers, wire screen stapled over them, cork plugs in both ends, one chamber packed with white queen candy, tin hanging strap, and a marked queen with attendant workers inside. Material controls: cage timber, wire screen, cork, queen candy, queen marking colour. Hanging-strap choice; freshCage, usedCage and redYearMark presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'queen cage', 'benton cage', 'queen bee', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const strap = param('strap', 'yes', { choices: ['yes', 'no'], label: 'Tin hanging strap' });

const timber = param('timber', '#d8b07a', { label: 'Cage block (hardwood)' });
const screen = param('screen', '#8c9396', { label: 'Screen, staples and strap (steel wire)' });
const cork = param('cork', '#a87a4c', { label: 'End plugs (cork)' });
const candy = param('candy', '#f2ede0', { label: 'Queen candy (fondant)' });
const mark = param('mark', '#f4f4f0', { label: 'Queen marking dot (year colour)' });

presets({
  freshCage: { timber: '#e8c590', screen: '#a7aeb0', cork: '#b88a58', candy: '#fbf8ee', mark: '#f4f4f0' },
  usedCage: { timber: '#9c7a50', screen: '#6d7173', cork: '#7d5a38', candy: '#d8ccaa', mark: '#e8d23a' },
  redYearMark: { timber: '#d8b07a', screen: '#8c9396', cork: '#a87a4c', candy: '#f2ede0', mark: '#d0302a' },
});

const p = assembly("queen-cage");
const add = (name, shape) => p.part(name, shape.scale(scale));

const L = 89;
const W = 25;
const H = 16;
const R = 10.5; // chamber radius
const FLOOR = 4; // chamber floor height
const holes = [-27, 0, 27];

// Block with three drilled chambers joined by small passages, and the
// end bores the corks sit in.
let block = box(L, W, H, true).translate(0, 0, H / 2);
for (const x of holes) block = block.subtract(cylinder(H, R, 28).translate(x, 0, FLOOR));
for (const x of [-13.5, 13.5]) block = block.subtract(box(10, 8, H, true).translate(x, 0, FLOOR + H / 2));
for (const s of [-1, 1]) block = block.subtract(cylinder(20, 4.5, 16).rotateY(90).translate(s > 0 ? L / 2 - 18 : -L / 2 - 2, 0, 9));
add('block', block.color(timber));

// Chamber floors: end grain at the bottom of each bore, a shade darker than the face.
for (const x of holes) add(`chamber-floor-${x}`, cylinder(0.6, R, 28).translate(x, 0, FLOOR).color('#8a6a44'));

// Candy packed in the -X chamber.
add('candy', cylinder(H - FLOOR - 1.5, R - 0.2, 28).translate(holes[0], 0, FLOOR).color(candy));

// Cork plugs, slightly proud of both end faces.
for (const s of [-1, 1]) {
  add(`cork-${s}`, cylinder(9, 4.8, 16).rotateY(90).translate(s > 0 ? L / 2 - 6 : -L / 2 - 3, 0, 9).color(cork));
}

// Queen in the middle chamber: long golden abdomen, dark thorax with the
// year-colour paint dot, head.
const QZ = FLOOR + 3.5;
add('queen-abdomen', sphere(3).scale([3, 1, 0.95]).translate(4, 0, QZ).color('#b8742a'));
add('queen-thorax', sphere(2.6).scale([1.2, 1, 1]).translate(-3.5, 0, QZ + 0.4).color('#2a2116'));
add('queen-head', sphere(1.8).translate(-7.6, 0, QZ + 0.2).color('#2a2116'));
add('queen-mark', cylinder(0.8, 1.4, 12).translate(-3.5, 0, QZ + 2.8).color(mark));
for (const s of [-1, 1]) {
  add(`queen-wing-${s}`, sphere(2).scale([2.2, 0.9, 0.2]).rotateZ(s * 18).translate(1.5, s * 2.4, QZ + 2.4).color('#d9dcd6'));
}

// Attendant workers in the +X chamber and one at the candy face.
for (const [x, y, a] of [[24, -4, 30], [30, 4, -150], [-18, 2, 180]]) {
  const worker = (part, r, c, dz) => add(`worker-${x}-${part}`, sphere(r).scale([1.7, 0.8, 0.8]).rotateZ(a).translate(x, y, FLOOR + 3 + dz).color(c));
  worker('body', 3.2, '#2a2116', 0);
  worker('stripe', 2.2, '#d79a2b', 0.4);
}

// Wire screen stapled over the face: a mesh of thin wires on a frame.
const SZ = H + 0.4;
for (let i = 0; i <= 7; i += 1) {
  const y = -W / 2 + 2 + (i * (W - 4)) / 7;
  add(`screen-long-${i}`, cylinder(L - 6, 0.18, 4).rotateY(90).translate(-L / 2 + 3, y, SZ).color(screen));
}
for (let i = 0; i <= 22; i += 1) {
  const x = -L / 2 + 3 + (i * (L - 6)) / 22;
  add(`screen-cross-${i}`, cylinder(W - 4, 0.18, 4).rotateX(90).translate(x, W / 2 - 2, SZ + 0.3).color(screen));
}
for (const x of [-38, -13, 13, 38]) {
  for (const s of [-1, 1]) add(`staple-${x}-${s}`, box(6, 0.8, 0.6, true).translate(x, s * (W / 2 - 1.5), SZ + 0.8).color(screen));
}

// Tin strap stapled to the +X end, bent up to hook over a top bar.
if (strap.value === 'yes') {
  add('strap-flat', box(22, 10, 0.5, true).translate(L / 2 - 6, 0, H + 1.2).color(screen));
  add('strap-riser', box(0.5, 10, 14, true).translate(L / 2 + 5, 0, H + 7).color(screen));
  add('strap-hook', box(14, 10, 0.5, true).translate(L / 2 + 12, 0, H + 14).color(screen));
  add('strap-staple', box(1, 6, 0.8, true).translate(L / 2 - 10, 0, H + 1.8).color(screen));
}

return p.model();
