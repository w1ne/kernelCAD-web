// Runway edge light: Low runway-edge fixture with a broad ground plate, short stem and raised light housing. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'runway-edge-light',
  license: 'CC0-1.0',
  title: 'Runway edge light',
  description: 'Low runway-edge fixture with a broad ground plate, short stem and raised light housing. Material controls: cast aluminium, optical glass, concrete base. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const castAluminium = param('castAluminium', '#98a5a8', { label: 'Cast aluminium' });
const lensGlass = param('lensGlass', '#e8c76c', { label: 'Optical glass' });
const concrete = param('concrete', '#858780', { label: 'Concrete base' });

presets({
  weathered: {
    castAluminium: '#536267',
    lensGlass: '#9b8242',
    concrete: '#555751',
  },
  highVisibility: {
    castAluminium: '#aeb9bb',
    lensGlass: '#e8c76c',
    concrete: '#999990',
  },
});
const p = assembly("runway-edge-light");
p.part("ground-plate", box(92, 72, 12, true).translate(0, 0, 6).scale(scale).color(concrete));
p.part("light-stem", cylinder(50, 11, 8).translate(0, 0, 12).scale(scale).color(castAluminium));
p.part("lamp-housing", sphere(24).scale([1.1, 1.1, 0.72]).translate(0, 0, 62).scale(scale).color(lensGlass));

return p.model();
