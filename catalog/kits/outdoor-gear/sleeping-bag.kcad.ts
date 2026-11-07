// Original low-poly sleeping bag with a choice of cut and three fabric colors.
// Millimetres, Z up, base at z = 0.

meta({
  name: 'sleeping-bag',
  license: 'CC0-1.0',
  title: 'Sleeping bag',
  description: 'Ground sleeping bag with a pillow hood, visible zipper and mummy or rectangular cut. Knobs: cut, shell, lining and zipper colours.',
  tags: ['sleeping bag', 'sleep sack', 'camping', 'hiking', 'outdoor', 'bedroll'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 260,
});

const cut = param('cut', 'mummy', { choices: ['mummy', 'rectangular'], label: 'Cut' });
const shell = param('shell', '#3f6980', { label: 'Shell' });
const lining = param('lining', '#c4b28c', { label: 'Lining and hood' });
const zipper = param('zipper', '#d9d4c5', { label: 'Zipper' });
presets({
  coldWeather: { shell: '#365b73', lining: '#c3b89d', zipper: '#e0d9c7' },
  summer: { shell: '#d16b3f', lining: '#d9c6a0', zipper: '#f1e4cc' },
});

const bag = assembly('sleeping-bag');
const outline = cut.value === 'mummy'
  ? [[-210, -1050], [210, -1050], [250, -760], [280, 380], [250, 760], [180, 960], [-180, 960], [-250, 760], [-280, 380], [-250, -760]]
  : [[-320, -1050], [320, -1050], [320, 850], [260, 1020], [-260, 1020], [-320, 850]];
const shellBody = extrudePolygon(outline, 100).color(shell);

bag.part('shell', shellBody);
bag.part('inner-panel', extrudePolygon(
  cut.value === 'mummy'
    ? [[-150, -900], [150, -900], [190, -650], [205, 350], [175, 720], [125, 850], [-125, 850], [-175, 720], [-205, 350], [-190, -650]]
    : [[-250, -900], [250, -900], [250, 800], [210, 900], [-210, 900], [-250, 800]],
  12,
).translate(0, 0, 100).color(lining));
bag.part('zipper-track', box(18, 1450, 16, true).translate(-110, -60, 120).color(zipper));
bag.part('hood-pillow', box(400, 270, 70, true).translate(0, 820, 136).color(lining));
bag.part('zipper-pull', box(48, 24, 24, true).translate(-110, 565, 138).color(zipper));

return bag.model();
