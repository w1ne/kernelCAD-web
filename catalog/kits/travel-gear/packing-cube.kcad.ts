// Original kernelCAD packing organizer with a cube or shoe-compartment layout.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'packing-cube', license: 'CC0-1.0', title: 'Packing cube',
  description: 'Soft packing organizer with a top zipper, grab handle and cube or shoe-compartment proportions. Knobs: size, layout and fabric colours.',
  tags: ['packing cube', 'packing organizer', 'travel', 'luggage', 'organizer'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'hotel', 'luggage'], triangleBudget: 420,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Cube size' });
const layout = param('layout', 'cube', { choices: ['cube', 'shoe'], label: 'Compartment shape' });
const fabric = param('fabric', '#5d6f7b', { label: 'Fabric' });
const trim = param('trim', '#d39a54', { label: 'Zipper and handle' });
const s = size.value === 'small' ? 0.78 : size.value === 'large' ? 1.22 : 1;
const shoe = layout.value === 'shoe';
const W = (shoe ? 390 : 300) * s;
const D = (shoe ? 190 : 240) * s;
const H = (shoe ? 150 : 220) * s;
const cube = assembly('packing-cube');
cube.part('fabric-case', box(W, D, H, true).translate(0, 0, H / 2).color(fabric));
cube.part('top-seam', box(W * 0.78, 14 * s, 12 * s, true).translate(0, -D / 2 - 8 * s, H * 0.9).color(trim));
cube.part('grab-handle', box(116 * s, 24 * s, 24 * s, true).translate(0, D / 2 + 12 * s, H + 8 * s).color(trim));
cube.part('front-panel', box(W * 0.52, 10 * s, H * 0.48, true).translate(0, -D / 2 - 7 * s, H * 0.47).color(trim));

return cube.model();
