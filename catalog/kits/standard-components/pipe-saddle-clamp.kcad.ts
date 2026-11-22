// SPDX-License-Identifier: CC0-1.0
// An illustrative two-piece pipe saddle, not a rated/fit-qualified clamp.
// The pipe axis runs along Y. Keep its aperture open across both ends.
meta({
  name: 'pipe-saddle-clamp',
  license: 'CC0-1.0',
  title: 'Pipe saddle clamp',
  description: 'Illustrative CC0 two-piece pipe saddle clamp with a lower curved cradle, a separate bolted top cap, two rubber half-liners, an open horizontal pipe passage, and four mounting-foot holes. Not manufacturer-grade CAD: no pipe standard, bolt specification, clearance tolerance or load rating. Knobs change scale and appearance colors only.',
  tags: ['pipe clamp', 'saddle clamp', 'tube support', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Illustrative model size' });
const steel = param('steel', '#85929a', { label: 'Steel appearance color' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber appearance color' });
presets({
  dark: { steel: '#3e484e', rubber: '#242729' },
  brass: { steel: '#646f75', rubber: '#2a2d2f' },
  weathered: { steel: '#665b4d', rubber: '#3b3935' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w, d, h).translate(x, y, z);
// A real pipe seat must be horizontal. A vertical donut on a flat plate is
// neither a saddle nor a two-piece clamp. Annular halves meet at Z=19 mm.
const halfBand = (outer: number, inner: number) =>
  cylinder(32 * s, outer * s, 24)
    .subtract(cylinder(34 * s, inner * s, 24).translate(0, 0, -s))
    .rotateX(90).translate(0, 16 * s, 19 * s);
const lowerHalf = (shape) => shape.intersect(block(-17 * s, -18 * s, 0, 34 * s, 36 * s, 19 * s));
const upperHalf = (shape) => shape.intersect(block(-17 * s, -18 * s, 19 * s, 34 * s, 36 * s, 18 * s));
const steelBand = halfBand(15, 13);
const linerBand = halfBand(13, 11.5);

let lower = block(-32 * s, -22 * s, 0, 64 * s, 44 * s, 5 * s)
  .union(lowerHalf(steelBand));
let cap = upperHalf(steelBand);
// Lower/upper ears are physically distinct; each overlaps its curved half.
for (const x of [-22, 13]) {
  lower = lower.union(block(x * s, -18 * s, 15 * s, 9 * s, 36 * s, 4 * s));
  cap = cap.union(block(x * s, -18 * s, 19 * s, 9 * s, 36 * s, 6 * s));
}
// Both ear bores are real through passages. Separate shaft/head solids follow.
for (const x of [-18, 18]) {
  const boltBore = cylinder(28 * s, 2.3 * s, 16).translate(x * s, 0, -s);
  lower = lower.subtract(boltBore);
  cap = cap.subtract(boltBore);
}
// The wide base is fixed independently of the two top-cap bolts.
for (const x of [-26, 26]) for (const y of [-14, 14]) {
  lower = lower.subtract(cylinder(7 * s, 2.3 * s, 16).translate(x * s, y * s, -s));
}

const a = assembly('pipe-saddle-clamp');
a.part('lower-saddle-and-foot', lower.color(steel));
a.part('removable-upper-cap', cap.color(steel));
a.part('lower-rubber-liner', lowerHalf(linerBand).color(rubber));
a.part('upper-rubber-liner', upperHalf(linerBand).color(rubber));
for (const x of [-18, 18]) {
  const bolt = cylinder(21 * s, 1.9 * s, 12).translate(x * s, 0, 4 * s)
    .union(cylinder(3 * s, 3.4 * s, 12).translate(x * s, 0, 25 * s));
  a.part(x < 0 ? 'left-clamp-bolt' : 'right-clamp-bolt', bolt.color(steel));
}
return a.model();
