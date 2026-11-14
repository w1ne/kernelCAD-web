// SPDX-License-Identifier: CC0-1.0
// Langstroth hive: the standard ten-frame beehive, a stack of interchangeable
// boxes sitting on a stand in an apiary.
// What makes it a Langstroth rather than a crate: a painted deep brood box
// with a recessed hand hold on every side, one or more shallower honey supers
// in a different paint above it, a thin queen excluder between brood and
// honey, a screened bottom board whose front lip forms the landing and leaves
// a slot entrance (narrowed by an entrance reducer), an inner cover, and a
// telescoping cover with a galvanized sheet folded over its rim, held down by
// a brick. The whole stack sits on a timber stand with a sloping landing
// ramp, and a few bees work the entrance.
// Generic visualization geometry at real size (413 x 505 mm boxes, 243 mm
// deep, 168 mm medium supers), millimetres, Z up, ground on z = 0, entrance
// facing -Y.

meta({
  name: "langstroth-hive",
  license: 'CC0-1.0',
  title: "Langstroth hive",
  description: "Ten-frame Langstroth beehive on a timber stand: screened bottom board with landing lip and entrance reducer, painted deep brood box with hand holds, queen excluder, one to three medium honey supers in a second paint, inner cover, telescoping cover with galvanized roof sheet and an optional brick weight, plus bees at the entrance. Material controls: brood-box paint, super paint, hive timber, galvanized roof, brick. Super-count and lid-weight choices; freshApiary, weatheredYard and pastelYard presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'beehive', 'langstroth', 'hive', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const supers = param('supers', '2', { choices: ['1', '2', '3'], label: 'Honey supers' });
const lidWeight = param('lidWeight', 'brick', { choices: ['brick', 'none'], label: 'Weight on the lid' });

const broodPaint = param('broodPaint', '#e8e3d3', { label: 'Brood box (exterior paint)' });
const superPaint = param('superPaint', '#d8bd5c', { label: 'Honey supers (exterior paint)' });
const timber = param('timber', '#b8874a', { label: 'Stand, bottom board and inner cover (timber)' });
const galvanized = param('galvanized', '#aeb9b7', { label: 'Roof sheet and queen excluder (galvanized steel)' });
const brick = param('brick', '#a2482f', { label: 'Lid brick' });

presets({
  freshApiary: { broodPaint: '#f3f0e6', superPaint: '#e6c867', timber: '#d4a462', galvanized: '#d3dad8', brick: '#b0533a' },
  weatheredYard: { broodPaint: '#b9b3a2', superPaint: '#9f8c4f', timber: '#68543d', galvanized: '#788482', brick: '#7c3c2a' },
  pastelYard: { broodPaint: '#8fb7c9', superPaint: '#e2a2a6', timber: '#c09a68', galvanized: '#c2cbc9', brick: '#9c4a34' },
});

const p = assembly("langstroth-hive");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 413; // box width (X), across the entrance
const D = 505; // box depth (Y), front to back
const BEE = '#2b2117';
const STRIPE = '#d9a33a';

// Timber stand: four legs, two long rails, a cross brace, and a sloping
// landing ramp leading up to the entrance.
const ZS = 360;
for (const x of [-180, 180]) {
  for (const y of [-260, 260]) add(`stand-leg-${x}-${y}`, b(x, y, 0, 70, 70, ZS - 100).color(timber));
  add(`stand-rail-${x}`, b(x, 0, ZS - 100, 45, 640, 100).color(timber));
}
add('stand-brace', b(0, 260, ZS - 180, 320, 40, 80).color(timber));
add('landing-ramp', box(W - 40, 200, 20, true).rotateX(30).translate(0, -416, 300).color(timber));

// Screened bottom board: a rim on three sides, a dark screen, and a front lip
// that sticks out as the landing board. The open front is the entrance slot.
add('bottom-board-landing', b(0, -40, ZS - 4, W, D + 80, 18).color(timber));
add('bottom-rim-left', b(-W / 2 + 10, 0, ZS + 14, 20, D, 22).color(timber));
add('bottom-rim-right', b(W / 2 - 10, 0, ZS + 14, 20, D, 22).color(timber));
add('bottom-rim-back', b(0, D / 2 - 10, ZS + 14, W, 20, 22).color(timber));
add('entrance-shadow', b(0, -D / 2 + 30, ZS + 14, W - 40, 60, 2).color('#1d1a16'));
// Entrance reducer: a cleat filling the slot with a small notch in the middle.
add('entrance-reducer-left', b(-120, -D / 2 + 10, ZS + 14, W / 2 - 50, 20, 22).color(timber));
add('entrance-reducer-right', b(120, -D / 2 + 10, ZS + 14, W / 2 - 50, 20, 22).color(timber));

// A hive box with a recessed hand hold on each side wall.
// The box stops 4 mm short of its nominal height so a dark joint line reads
// between stacked boxes.
const hiveBox = (z, h) => {
  let s = box(W, D, h - 4, true).translate(0, 0, z + 2 + (h - 4) / 2);
  const hz = z + h * 0.62;
  for (const sx of [-1, 1]) s = s.subtract(box(24, 130, 34, true).translate(sx * W / 2, 0, hz));
  for (const sy of [-1, 1]) s = s.subtract(box(130, 24, 34, true).translate(0, sy * D / 2, hz));
  return s;
};
const joint = (name, z) => add(name, b(0, 0, z - 2, W - 8, D - 8, 4).color('#3a2f22'));

// Deep brood box.
const ZBR = ZS + 36; // top of the bottom-board rim
const HB = 243;
add('brood-box', hiveBox(ZBR, HB).color(broodPaint));
joint('brood-joint', ZBR);

// Queen excluder: a thin galvanized sheet whose edge shows between boxes.
let z = ZBR + HB;
add('queen-excluder', b(0, 0, z, W + 4, D + 4, 5).color(galvanized));
z += 5;

// Medium honey supers.
const nSupers = Number(supers.value);
for (let i = 0; i < nSupers; i += 1) {
  add(`honey-super-${i + 1}`, hiveBox(z, 168).color(superPaint));
  if (i > 0) joint(`super-joint-${i}`, z);
  z += 168;
}

// Inner cover with its oval bee-escape hole.
let inner = box(W, D, 20, true).translate(0, 0, z + 10);
inner = inner.subtract(cylinder(30, 30, 16).scale([1.8, 1, 1]).translate(0, 0, z - 5));
add('inner-cover', inner.color(timber));
z += 20;

// Telescoping cover: a timber rim box overhanging the stack, capped with a
// galvanized sheet folded down over its edges.
const CW = W + 56;
const CD = D + 56;
add('cover-rim', b(0, 0, z - 50, CW, CD, 70).color(timber));
add('roof-sheet', b(0, 0, z + 20, CW + 6, CD + 6, 3).color(galvanized));
for (const sx of [-1, 1]) add(`roof-skirt-x${sx}`, b(sx * (CW / 2 + 2), 0, z - 15, 3, CD + 6, 38).color(galvanized));
for (const sy of [-1, 1]) add(`roof-skirt-y${sy}`, b(0, sy * (CD / 2 + 2), z - 15, CW + 6, 3, 38).color(galvanized));
z += 23;

// A brick on the lid against wind, set slightly askew.
if (lidWeight.value === 'brick') {
  let br = box(215, 102, 65, true);
  for (const x of [-55, 0, 55]) br = br.subtract(cylinder(80, 14, 10).translate(x, 0, -40));
  add('lid-brick', br.rotateZ(17).translate(40, 60, z + 32.5).color(brick));
}

// Bees at work on the landing lip and one in flight.
const bee = (name, x, y, zz, yaw) => {
  add(`${name}-body`, sphere(9).scale([1.7, 1, 1]).rotateZ(yaw).translate(x, y, zz).color(BEE));
  add(`${name}-stripe`, cylinder(4, 9.3, 10).rotateY(90).rotateZ(yaw).translate(x, y, zz).color(STRIPE));
  add(`${name}-wings`, box(10, 26, 1.5, true).rotateZ(yaw).translate(x, y, zz + 9).color('#e9eef0'));
};
bee('bee-1', -60, -D / 2 - 30, ZS + 23, 80);
bee('bee-2', 30, -D / 2 - 55, ZS + 23, 115);
bee('bee-3', 95, -D / 2 - 15, ZS + 23, 60);
bee('bee-4', -20, -D / 2 - 180, ZS + 140, 30);

return p.model();
