meta({
  name: 'solar-electric-meter',
  license: 'CC0-1.0',
  title: 'Solar electric meter',
  description: 'Meter pedestal with a round meter face, upper enclosure and conduit base.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#77817d', { label: 'Asset color' });
const p = assembly("solar-electric-meter");
p.part("instrument-base", box(180, 130, 54, true).translate(0, 0, 27).scale(scale).color(color));
p.part("instrument-mast", cylinder(717.6, 24, 8).translate(0, 0, 54).scale(scale).color(color));
p.part("meter-enclosure", box(316.8, 187.2, 340.4, true).translate(0, 0, 625.6).scale(scale).color(color));
p.part("meter-ring", cylinder(36, 72, 8).rotate([1, 0, 0], 90).translate(0, 119.2, 625.6).scale(scale).color(color));
p.part("meter-face", cylinder(12, 57.6, 8).rotate([1, 0, 0], 90).translate(0, 108.2, 625.6).scale(scale).color(color));

return p.model();
