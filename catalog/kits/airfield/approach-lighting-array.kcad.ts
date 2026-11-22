// Approach lighting array: Approach-light runway fixture with a long crossbar, center mast and side braces. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'approach-lighting-array',
  license: 'CC0-1.0',
  title: 'Approach lighting array',
  description: 'Approach-light runway fixture with a long crossbar, center mast and side braces. Material controls: galvanized steel, optical glass. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#8c999c', { label: 'Galvanized steel' });
const lensGlass = param('lensGlass', '#e8c766', { label: 'Optical glass' });

presets({
  weathered: {
    galvanizedSteel: '#536267',
    lensGlass: '#9b8242',
  },
  highVisibility: {
    galvanizedSteel: '#aeb9bb',
    lensGlass: '#e8c766',
  },
});
const p = assembly("approach-lighting-array");
p.part("center-mast", cylinder(190, 12, 8).scale(scale).color(galvanizedSteel));
p.part("crossbar", box(18, 330, 18, true).translate(0, 0, 188).scale(scale).color(galvanizedSteel));
p.part("center-light", sphere(22).scale([1, 1, 0.7]).translate(0, 0, 205).scale(scale).color(lensGlass));
p.part("left-brace", box(18, 18, 144, true).translate(0, -122, 108).scale(scale).color(galvanizedSteel));
p.part("left-end-light", sphere(18).scale([0.9, 0.9, 0.7]).translate(0, -122, 202).scale(scale).color(lensGlass));
p.part("right-brace", box(18, 18, 144, true).translate(0, 122, 108).scale(scale).color(galvanizedSteel));
p.part("right-end-light", sphere(18).scale([0.9, 0.9, 0.7]).translate(0, 122, 202).scale(scale).color(lensGlass));

return p.model();
