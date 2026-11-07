// Track Hurdle: Portable low-poly running hurdle with two feet, uprights and a crossbar. Low-poly sports prop in millimetres, Z up; materials: anodized aluminium, crossbar polymer, foot rubber.
meta({
  name: 'track-hurdle',
  license: 'CC0-1.0',
  title: 'Track hurdle',
  description: "Portable low-poly running hurdle with two feet, uprights and a crossbar. Material controls: anodized aluminium, crossbar polymer, foot rubber.",
  tags: ['track hurdle', 'hurdle', 'athletics', 'track', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const anodizedAluminium = param('anodizedAluminium', '#a5b0b2', { label: 'Anodized aluminium' });
const crossbarPolymer = param('crossbarPolymer', '#d9c554', { label: 'Crossbar polymer' });
const footRubber = param('footRubber', '#333a3d', { label: 'Foot rubber' });
presets({ clubColors: { anodizedAluminium: '#a5b0b2', crossbarPolymer: '#d84b40' } });
const p = assembly('track-hurdle');
p.part('left-upright', cylinder(170, 6, 8).translate(-115, 0, 0).scale(scale).color(anodizedAluminium));
p.part('right-upright', cylinder(170, 6, 8).translate(115, 0, 0).scale(scale).color(anodizedAluminium));
p.part('crossbar', box(250, 16, 14, true).translate(0, 0, 170).scale(scale).color(crossbarPolymer));
p.part('left-foot', box(88, 24, 8, true).translate(-115, 0, 4).scale(scale).color(footRubber));
p.part('right-foot', box(88, 24, 8, true).translate(115, 0, 4).scale(scale).color(footRubber));

return p.model();
