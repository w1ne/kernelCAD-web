meta({
  name: 'solar-roof-section',
  license: 'CC0-1.0',
  title: 'Solar roof section',
  description: 'Small pitched-roof display with framed panels, ridge cap and two mounting rails.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#7c7462', { label: 'Asset color' });
const p = assembly("solar-roof-section");
p.part("roof-deck", box(1180, 820, 64, true).translate(0, 0, 50).scale(scale).color(color));
p.part("ridge-cap", box(1204, 52, 50, true).translate(0, 0, 116).scale(scale).color(color));
p.part("roof-module-0-frame", box(395.6, 362.4, 22, true).translate(-318.6, -98.4, 210).scale(scale).color(color));
p.part("roof-module-0-surface", box(377.6, 344.4, 22, true).translate(-318.6, -98.4, 231).scale(scale).color(color));
p.part("roof-module-1-frame", box(395.6, 362.4, 22, true).translate(318.6, -98.4, 210).scale(scale).color(color));
p.part("roof-module-1-surface", box(377.6, 344.4, 22, true).translate(318.6, -98.4, 231).scale(scale).color(color));
p.part("roof-rail-0", box(991.2, 30, 24, true).translate(0, -246, 144).scale(scale).color(color));
p.part("roof-rail-1", box(991.2, 30, 24, true).translate(0, 246, 144).scale(scale).color(color));

return p.model();
