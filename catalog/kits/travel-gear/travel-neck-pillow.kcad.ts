// Original kernelCAD padded neck rest with a classic open front or clasped wrap.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'travel-neck-pillow', license: 'CC0-1.0', title: 'Travel neck pillow',
  description: 'U-shaped padded neck rest in child or adult size with a classic or wraparound front. Knobs: size, shape, clasp and fabric color.',
  tags: ['travel neck pillow', 'neck rest', 'travel', 'comfort', 'airplane'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'airplane', 'train'], triangleBudget: 560,
});

const size = param('size', 'adult', { choices: ['child', 'adult'], label: 'Pillow size' });
const shape = param('shape', 'classic', { choices: ['classic', 'wrap'], label: 'Front shape' });
const clasp = param('clasp', 'with clasp', { choices: ['with clasp', 'no clasp'], label: 'Front clasp' });
const fabric = param('fabric', '#55788a', { label: 'Pillow fabric' });
const s = size.value === 'child' ? 0.76 : 1;
const wrap = shape.value === 'wrap';
const baseLift = 36.56 * s;
const pillow = assembly('travel-neck-pillow');

pillow.part('rear-cushion', sphere(112 * s).scale([1.5, 0.86, 0.62]).translate(0, 92 * s, 106 * s - baseLift).color(fabric));
for (const side of [-1, 1]) {
  const tipY = wrap ? -110 : -54;
  pillow.part(`side-cushion-${side < 0 ? 'left' : 'right'}`,
    sphere(92 * s).scale([0.84, 1.18, 0.64]).translate(side * 108 * s, -18 * s, 106 * s - baseLift).color(fabric));
  pillow.part(`front-tip-${side < 0 ? 'left' : 'right'}`,
    sphere((wrap ? 78 : 68) * s).scale([0.86, 1.18, 0.66]).translate(side * 102 * s, tipY, 106 * s - baseLift).color(fabric));
}

if (wrap && clasp.value === 'with clasp') {
  pillow.part('front-clasp', box(44 * s, 28 * s, 34 * s, true).translate(0, -176 * s, 106 * s - baseLift).color(fabric));
}

return pillow.model();
