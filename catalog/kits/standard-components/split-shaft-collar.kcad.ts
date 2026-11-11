// SPDX-License-Identifier: CC0-1.0
// Illustrative split clamp shaft collar: a real radial saw gap, two opposed
// clamp lugs, an axial shaft bore, and a separate crosswise clamping screw.
// Low-poly scene prop only; not vendor CAD or proof of grip torque/shaft fit.
meta({
  name: 'split-shaft-collar',
  license: 'CC0-1.0',
  title: 'Split shaft collar',
  description: 'Illustrative CC0 low-poly split shaft collar with 18 mm through bore, radial slot, two opposed clamp lugs, a crosswise clamp-screw clearance hole and a distinct simplified clamp screw. Three uniform size choices; not vendor manufacturing CAD or a load-rated shaft connection. Color controls: steel and zinc-plated steel.',
  tags: ['shaft collar', 'split collar', 'clamp', 'rotating shaft', 'low poly', 'scene prop', 'CC0'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 400,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated steel' });
presets({
  dark: { steel: '#3e484e', zinc: '#929da3' },
  brass: { steel: '#646f75', zinc: '#c29a5c' },
  weathered: { steel: '#665b4d', zinc: '#a19682' },
});
const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w * s, d * s, h * s).translate(x * s, y * s, z * s);
const acrossX = (start: number, length: number, radius: number) =>
  cylinder(length * s, radius * s, 8).rotateY(90).translate(start * s, -17 * s, 5 * s);

// The slot enters the shaft bore from the -Y rim. Both lugs remain attached to
// the ring but are separated across the slot so the screw can close the gap.
let collar = cylinder(10 * s, 18 * s, 20)
  .subtract(cylinder(12 * s, 9 * s, 20).translate(0, 0, -s))
  .subtract(block(-1.75, -21, -1, 3.5, 13, 12));
collar = collar.union(block(-12, -22, 1, 10, 9, 8));
collar = collar.union(block(2, -22, 1, 10, 9, 8));
// Drill both lugs along X. Clearance remains around the simplified screw.
collar = collar.subtract(acrossX(-14, 28, 2.25));

const fastener = acrossX(-12, 25, 1.9)
  .union(acrossX(13, 4, 3.4));
const a = assembly('split-shaft-collar');
a.part('split-collar-body', collar.color(steel));
a.part('clamp-screw', fastener.color(zinc));
return a.model();
