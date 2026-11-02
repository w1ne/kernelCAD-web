// Original kernelCAD rolling case with a telescoping handle and spinner wheels.
// Millimetres, Z up, wheels sit on z = 0.
meta({
  name: 'rolling-suitcase', license: 'CC0-1.0', title: 'Rolling suitcase',
  description: 'Modern hard-shell case with four spinner wheels, a telescoping handle and top grip. Knobs: size, handle, shell and trim colours.',
  tags: ['rolling suitcase', 'carry-on', 'luggage', 'spinner wheels', 'travel'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'airport', 'hotel'], triangleBudget: 900,
});

const size = param('size', 'cabin', { choices: ['cabin', 'check-in'], label: 'Case size' });
const handle = param('handle', 'extended', { choices: ['retracted', 'extended'], label: 'Trolley handle' });
const shell = param('shell', '#356a84', { label: 'Shell' });
const trim = param('trim', '#242c34', { label: 'Wheels and fittings' });
const s = size.value === 'cabin' ? 0.78 : 1.12;
const width = 430 * s;
const depth = 270 * s;
const height = 600 * s;
const base = 70 * s;
const caseModel = assembly('rolling-suitcase');

caseModel.part('hard-shell', box(width, depth, height, true).translate(0, 0, base + height / 2).color(shell));
caseModel.part('front-rib', box(width * 0.76, 14 * s, height * 0.72, true).translate(0, -depth / 2 - 7 * s, base + height * 0.53).color(trim));
caseModel.part('top-grip', box(112 * s, 54 * s, 28 * s, true).translate(0, depth * 0.18, base + height + 12 * s).color(trim));

const railHeight = handle.value === 'extended' ? 360 * s : 120 * s;
for (const x of [-74 * s, 74 * s]) {
  caseModel.part(`trolley-rail-${x < 0 ? 'left' : 'right'}`, cylinder(railHeight, 13 * s, 8)
    .translate(x, depth * 0.22, base + height).color(trim));
}
caseModel.part('trolley-grip', box(178 * s, 34 * s, 32 * s, true)
  .translate(0, depth * 0.22, base + height + railHeight + 12 * s).color(trim));

for (const x of [-1, 1]) for (const y of [-1, 1]) {
  caseModel.part(`spinner-${x}-${y}`, cylinder(46 * s, 35 * s, 10).rotateX(90)
    .translate(x * (width / 2 - 34 * s), y * (depth / 2 - 24 * s), 35 * s).color(trim));
}

return caseModel.model();
