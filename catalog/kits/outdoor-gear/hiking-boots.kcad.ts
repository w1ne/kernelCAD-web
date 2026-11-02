// Original pair of low-poly hiking boots with laces and chunky soles.
// Millimetres, Z up, soles at z = 0.

meta({
  name: 'hiking-boots',
  license: 'CC0-1.0',
  title: 'Hiking boots',
  description: 'Pair of ankle-high trail boots with lugged soles, padded collars and contrasting laces. Knobs: boot size, leather, sole and lace colours.',
  tags: ['hiking boots', 'trail shoes', 'footwear', 'camping', 'outdoor', 'hiking'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 380,
});

const size = param('size', '42', { choices: ['39', '42', '45'], label: 'EU size' });
const leather = param('leather', '#93633d', { label: 'Upper' });
const sole = param('sole', '#302e2b', { label: 'Sole' });
const laces = param('laces', '#d5c6a5', { label: 'Laces' });

const scale = Number(size.value) / 42;
const boots = assembly('hiking-boots');
const makeBoot = (x: number, suffix: string) => {
  boots.part(suffix + '-sole', box(138 * scale, 330 * scale, 34, true).translate(x, -25, 18).color(sole));
  boots.part(suffix + '-upper', box(120 * scale, 260 * scale, 150 * scale, true).translate(x, -22, 105 * scale).color(leather));
  boots.part(suffix + '-toe', sphere(74 * scale).scale([1.0, 1.4, 0.78]).translate(x, -110 * scale, 96 * scale).color(leather));
  boots.part(suffix + '-collar', box(126 * scale, 128 * scale, 48 * scale, true).translate(x, 72 * scale, 190 * scale).color(leather));
  for (let i = 0; i < 4; i++) {
    boots.part(suffix + '-lace-' + (i + 1), box(78 * scale, 18 * scale, 12 * scale, true)
      .rotateZ(i % 2 === 0 ? 12 : -12)
      .translate(x, 16 * scale + i * 31 * scale, 188 * scale - i * 27 * scale)
      .color(laces));
  }
};

makeBoot(-100, 'left');
makeBoot(100, 'right');

return boots.model();
