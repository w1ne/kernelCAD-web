// Original kernelCAD soft eye mask with a contoured nose bridge and strap width.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'sleep-mask', license: 'CC0-1.0', title: 'Sleep mask',
  description: 'Soft eye mask with a flat or contoured bridge and narrow or wide side strap. Knobs: mask shape, strap width and fabric colors.',
  tags: ['sleep mask', 'eye mask', 'travel', 'rest', 'airplane'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'airplane', 'train', 'sleep'], triangleBudget: 340,
});

const shape = param('shape', 'contoured', { choices: ['contoured', 'flat'], label: 'Nose bridge' });
const strap = param('strap', 'wide', { choices: ['narrow', 'wide'], label: 'Head strap' });
const fabric = param('fabric', '#6d536e', { label: 'Mask fabric' });
const band = param('band', '#353139', { label: 'Head band' });
const mask = assembly('sleep-mask');
mask.part('eye-panel', box(320, 58, 110, true).translate(0, 0, 55).color(fabric));
mask.part('left-eye-pad', sphere(74).scale([1.12, 0.5, 0.68]).translate(-78, -20, 60).color(fabric));
mask.part('right-eye-pad', sphere(74).scale([1.12, 0.5, 0.68]).translate(78, -20, 60).color(fabric));

if (shape.value === 'contoured') {
  mask.part('nose-bridge', box(62, 50, 72, true).translate(0, -13, 42).color(fabric));
}

const bandHeight = strap.value === 'wide' ? 42 : 22;
mask.part('left-head-band', box(190, 22, bandHeight, true).translate(-228, 8, 58).color(band));
mask.part('right-head-band', box(190, 22, bandHeight, true).translate(228, 8, 58).color(band));

return mask.model();
