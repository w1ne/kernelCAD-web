// Original pair of adjustable low-poly trekking poles.
// Millimetres, Z up, pole tips at z = 0.

meta({
  name: 'trekking-poles',
  license: 'CC0-1.0',
  title: 'Trekking poles',
  description: 'Pair of trail poles with rubber tips, baskets, adjustable shafts and ergonomic grips. Knobs: pole length, shaft, grip and tip colours.',
  tags: ['trekking poles', 'hiking poles', 'walking sticks', 'camping', 'trail', 'outdoor'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 500,
});

const length = param('length', '1200', { choices: ['1000', '1200', '1400'], label: 'Pole length (mm)' });
const shaft = param('shaft', '#a64b35', { label: 'Shafts' });
const grip = param('grip', '#343739', { label: 'Grips' });
const tip = param('tip', '#b7b8b5', { label: 'Tips and baskets' });

const poleLength = Number(length.value);
const poles = assembly('trekking-poles');
for (const x of [-105, 105]) {
  const side = x < 0 ? 'left' : 'right';
  poles.part(side + '-tip', cylinder(46, 9, 6).translate(x, 0, 0).color(tip));
  poles.part(side + '-shaft', cylinder(poleLength - 48, 13, 8).translate(x, 0, 44).color(shaft));
  poles.part(side + '-basket', cylinder(12, 42, 8).translate(x, 0, 230).color(tip));
  poles.part(side + '-grip', cylinder(118, 24, 8).translate(x, 0, poleLength - 78).color(grip));
  poles.part(side + '-cap', cylinder(30, 22, 8).translate(x, 0, poleLength + 38).color(grip));
  poles.part(side + '-strap', box(24, 26, 120, true).translate(x, 34, poleLength - 15).color(grip));
}

return poles.model();
