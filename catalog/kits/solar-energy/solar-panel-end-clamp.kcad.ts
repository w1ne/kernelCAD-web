meta({
  name: 'solar-panel-end-clamp',
  license: 'CC0-1.0',
  title: 'Solar panel end clamp',
  description: 'Small adjustable rail clamp with a slotted base and raised pressure jaw.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#7b817a', { label: 'Asset color' });
const p = assembly("solar-panel-end-clamp");
p.part("clamp-base", box(150, 110, 28, true).translate(0, 0, 14).scale(scale).color(color));
p.part("slotted-foot", box(96, 72.6, 18, true).translate(0, 0, 37).scale(scale).color(color));
p.part("clamp-jaw", box(52.5, 57.2, 66.24, true).translate(0, 0, 44.16).scale(scale).color(color));
p.part("pressure-cap", box(105, 79.2, 22, true).translate(0, 0, 81).scale(scale).color(color));
p.part("clamp-bolt", cylinder(48, 12, 8).translate(0, 0, 24).scale(scale).color(color));

return p.model();
