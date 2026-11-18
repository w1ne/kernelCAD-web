// SPDX-License-Identifier: CC0-1.0
// Shaft collar: a bored ring can use a split clamp with a cross-bolt or a
// radial set screw. Both retention styles visibly change the collar itself.
meta({
  name: 'shaft-collar',
  license: 'CC0-1.0',
  title: 'Shaft collar',
  description: 'Bored shaft collar with a selectable split-clamp and cross-bolt style or a one-piece radial set-screw style. Knobs: model size, retention style, steel collar and zinc-plated hardware; dark, brass and weathered presets.',
  tags: ['shaft collar', 'set collar', 'split clamp', 'shaft hardware', 'rotating shaft'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 560,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const retention = param('retention', 'splitClamp', { choices: ['splitClamp', 'setScrew'], label: 'Shaft retention style' });
const steel = param('steel', '#85929a', { label: 'Steel collar' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated fasteners' });
presets({
  dark: { steel: '#3e484e', zinc: '#929da3' },
  brass: { steel: '#646f75', zinc: '#c29a5c' },
  weathered: { steel: '#665b4d', zinc: '#a19682' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const splitClamp = retention.value === 'splitClamp';
let ring = cylinder(12 * s, 19 * s, 16)
  .subtract(cylinder(14 * s, 10 * s, 16).translate(0, 0, -s));

const a = assembly('shaft-collar');
if (splitClamp) {
  // The slot opens the bore through the collar wall. Two overlapping lugs
  // make the transverse clamp bolt clear in the catalog-angle silhouette.
  ring = ring.subtract(box(5 * s, 22 * s, 14 * s, true).translate(0, -15 * s, 6 * s));
  for (const side of [-1, 1]) {
    ring = ring.union(box(5 * s, 6 * s, 12 * s, true).translate(side * 3.5 * s, -17.5 * s, 6 * s));
  }
  ring = ring.subtract(cylinder(12 * s, 2.2 * s, 8).rotateY(90).translate(-6 * s, -17.5 * s, 6 * s));
  a.part('split-collar-with-clamp-ears', ring.color(steel));
  a.part('cross-clamp-bolt', cylinder(12 * s, 1.8 * s, 8)
    .rotateY(90).translate(-6 * s, -17.5 * s, 6 * s).color(zinc));
  a.part('clamp-bolt-head', cylinder(2.5 * s, 3.2 * s, 6)
    .rotateY(-90).translate(-6 * s, -17.5 * s, 6 * s).color(zinc));
  a.part('clamp-bolt-nut', cylinder(2.5 * s, 3.2 * s, 6)
    .rotateY(90).translate(6 * s, -17.5 * s, 6 * s).color(zinc));
} else {
  a.part('one-piece-collar', ring.color(steel));
  a.part('radial-set-screw-boss', cylinder(8 * s, 5 * s, 10)
    .rotateX(-90).translate(0, -19 * s, 8 * s).color(steel));
  a.part('radial-set-screw', cylinder(3 * s, 2.5 * s, 6)
    .rotateX(-90).translate(0, -22 * s, 8 * s).color(zinc));
}
return a.model();
