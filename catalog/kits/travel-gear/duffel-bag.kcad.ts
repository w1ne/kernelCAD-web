// Original kernelCAD soft duffel with handles or a shoulder sling.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'duffel-bag', license: 'CC0-1.0', title: 'Travel duffel bag',
  description: 'Cylindrical soft-sided travel duffel with end panels, zipper seam and a selectable carry arrangement. Knobs: length, carry style and fabric colours.',
  tags: ['duffel bag', 'travel bag', 'weekender', 'luggage', 'travel'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'hotel', 'gym'], triangleBudget: 650,
});

const length = param('length', '550', { choices: ['450', '550', '650'], label: 'Bag length (mm)' });
const carry = param('carry', 'handles', { choices: ['handles', 'shoulder strap'], label: 'Carry style' });
const fabric = param('fabric', '#46645c', { label: 'Fabric' });
const trim = param('trim', '#c18147', { label: 'Trim' });
const L = Number(length.value);
const bag = assembly('duffel-bag');
bag.part('soft-body', cylinder(L, 125, 12).rotateY(90).translate(-L / 2, 0, 125).color(fabric));
bag.part('zipper-run', box(L * 0.78, 14, 18, true).translate(0, -119, 222).color(trim));
bag.part('end-left', cylinder(16, 112, 12).rotateY(90).translate(-L / 2 - 8, 0, 125).color(trim));
bag.part('end-right', cylinder(16, 112, 12).rotateY(90).translate(L / 2 - 8, 0, 125).color(trim));

if (carry.value === 'handles') {
  for (const x of [-L * 0.2, L * 0.2]) {
    bag.part(`handle-leg-${x < 0 ? 'left' : 'right'}`, box(28, 24, 118, true).translate(x, 0, 220).color(trim));
  }
  bag.part('handle-grip', box(L * 0.48, 24, 28, true).translate(0, 0, 278).color(trim));
} else {
  bag.part('shoulder-sling', box(L * 0.94, 22, 24, true).rotateZ(12).translate(0, 0, 262).color(trim));
}

return bag.model();
