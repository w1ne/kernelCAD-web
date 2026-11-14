// Flat joining plate: a steel strap joins two parts in line. Its selectable
// three-, four-, or five-hole row changes the plate length, real through-bores,
// and matching zinc-plated fasteners together.
meta({
  name: 'flat-joining-plate',
  license: 'CC0-1.0',
  title: 'Flat joining plate',
  description: 'Flat powder-coated steel strap for joining two parts in line, with a selectable three-, four-, or five-hole layout. Changing the hole count resizes the strap and adds or removes matching zinc-plated fasteners. Knobs: model size, mounting-hole count, painted steel, zinc-plated fasteners.',
  tags: ['joining plate', 'strap plate', 'mounting plate', 'connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 800,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const holeCount = param('holeCount', 'four', { choices: ['three', 'four', 'five'], label: 'Mounting-hole count' });
const steel = param('steel', '#3d7290', { label: 'Painted steel' });
const zinc = param('zinc', '#d9dfe2', { label: 'Zinc-plated fasteners' });
presets({
  dark: { steel: '#33434b', zinc: '#9ca8ad' },
  brass: { steel: '#536d79', zinc: '#c29a5c' },
  weathered: { steel: '#665b4d', zinc: '#a19682' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const count = holeCount.value === 'three' ? 3 : holeCount.value === 'five' ? 5 : 4;
const holeXs = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 20 * s);
const plateLength = (20 * (count - 1) + 24) * s;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('flat-joining-plate');
const t=5*s;
let plate = block(-plateLength / 2, -12 * s, 0, plateLength, 24 * s, t);
plate = plate.holes('top', {
  positions: holeXs.map((u) => ({ u, v: 0 })),
  diameter: 6 * s,
  depth: 'through',
});
a.part('plate', plate.color(steel));
for (const [i, x] of holeXs.entries()) {
  a.part(`bolt-shank-${i + 1}`,cylinder(t,2.3*s,8).translate(x,0,0).color(zinc));
  a.part(`bolt-head-${i + 1}`,cylinder(2.5*s,4*s,6).translate(x,0,t).color(zinc));
}
return a.model();
