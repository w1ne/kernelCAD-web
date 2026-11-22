// Precision approach indicator: Four-unit visual approach indicator bar on a low ground stand. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'precision-approach-indicator',
  license: 'CC0-1.0',
  title: 'Precision approach indicator',
  description: 'Four-unit visual approach indicator bar on a low ground stand. Material controls: galvanized steel, optical glass, housing paint. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#818f93', { label: 'Galvanized steel' });
const lensGlass = param('lensGlass', '#e8e2ce', { label: 'Optical glass' });
const housingPaint = param('housingPaint', '#53666a', { label: 'Housing paint' });

presets({
  weathered: {
    galvanizedSteel: '#536267',
    lensGlass: '#9b8242',
    housingPaint: '#596765',
  },
  highVisibility: {
    galvanizedSteel: '#aeb9bb',
    lensGlass: '#e8e2ce',
    housingPaint: '#f0b52f',
  },
});
const p = assembly("precision-approach-indicator");
p.part("base-rail", box(290, 45, 18, true).translate(0, 0, 9).scale(scale).color(housingPaint));
p.part("lamp-1", box(48, 40, 62, true).translate(-108, 0, 49).scale(scale).color(lensGlass));
p.part("lamp-bracket-1", box(16, 16, 34, true).translate(-108, 0, 18).scale(scale).color(galvanizedSteel));
p.part("lamp-2", box(48, 40, 62, true).translate(-36, 0, 49).scale(scale).color(lensGlass));
p.part("lamp-bracket-2", box(16, 16, 34, true).translate(-36, 0, 18).scale(scale).color(galvanizedSteel));
p.part("lamp-3", box(48, 40, 62, true).translate(36, 0, 49).scale(scale).color(lensGlass));
p.part("lamp-bracket-3", box(16, 16, 34, true).translate(36, 0, 18).scale(scale).color(galvanizedSteel));
p.part("lamp-4", box(48, 40, 62, true).translate(108, 0, 49).scale(scale).color(lensGlass));
p.part("lamp-bracket-4", box(16, 16, 34, true).translate(108, 0, 18).scale(scale).color(galvanizedSteel));

return p.model();
