// Original kernelCAD wash kit with a compact case or hanging organizer form.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'toiletry-bag', license: 'CC0-1.0', title: 'Toiletry bag',
  description: 'Travel wash kit with a top zipper, side grip and compact or hanging form. Knobs: layout, size and fabric colours.',
  tags: ['toiletry bag', 'wash kit', 'travel organizer', 'travel', 'luggage'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'hotel', 'bathroom'], triangleBudget: 420,
});

const layout = param('layout', 'case', { choices: ['case', 'hanging'], label: 'Organizer layout' });
const size = param('size', 'standard', { choices: ['compact', 'standard'], label: 'Bag size' });
const fabric = param('fabric', '#64765f', { label: 'Fabric' });
const trim = param('trim', '#c48a4b', { label: 'Zipper and fittings' });
const s = size.value === 'compact' ? 0.78 : 1;
const hanging = layout.value === 'hanging';
const W = (hanging ? 330 : 310) * s;
const D = (hanging ? 100 : 180) * s;
const H = (hanging ? 380 : 185) * s;
const kit = assembly('toiletry-bag');
kit.part('main-case', box(W, D, H, true).translate(0, 0, H / 2).color(fabric));
kit.part('zipper-seam', box(W * 0.84, 15 * s, 12 * s, true).translate(0, -D / 2 - 8 * s, H * 0.78).color(trim));
kit.part('side-grip', box(90 * s, 30 * s, 22 * s, true).translate(W / 2 + 30 * s, 0, H * 0.52).color(trim));
kit.part('front-pocket', box(W * 0.62, 12 * s, H * 0.3, true).translate(0, -D / 2 - 7 * s, H * 0.34).color(trim));

if (hanging) {
  kit.part('hanger-stem', cylinder(112 * s, 14 * s, 8).translate(0, 0, H + 54 * s).color(trim));
  kit.part('hanger-hook', box(70 * s, 14 * s, 16 * s, true).translate(0, 0, H + 116 * s).color(trim));
  kit.part('top-hinge', box(76 * s, 34 * s, 28 * s, true).translate(0, 0, H + 10 * s).color(trim));
}

return kit.model();
