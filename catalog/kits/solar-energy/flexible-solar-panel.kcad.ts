meta({
  name: 'flexible-solar-panel',
  license: 'CC0-1.0',
  title: 'Flexible solar panel',
  description: 'Thin flexible PV sheet with rounded low-profile border and edge grommets.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#536d7a', { label: 'Asset color' });
const p = assembly("flexible-solar-panel");
p.part("flexible-sheet", box(760, 430, 18, true).translate(0, 0, 25).scale(scale).color(color));
p.part("edge-border", box(778, 448, 8, true).translate(0, 0, 10).scale(scale).color(color));
p.part("grommet-0-0", cylinder(14, 18, 8).translate(-319.2, -180.6, 0).scale(scale).color(color));
p.part("grommet-0-1", cylinder(14, 18, 8).translate(-319.2, 180.6, 0).scale(scale).color(color));
p.part("grommet-1-0", cylinder(14, 18, 8).translate(319.2, -180.6, 0).scale(scale).color(color));
p.part("grommet-1-1", cylinder(14, 18, 8).translate(319.2, 180.6, 0).scale(scale).color(color));
p.part("flex-cell-line-1", box(734, 3, 2, true).translate(0, -86, 35).scale(scale).color(color));
p.part("flex-cell-line-2", box(734, 3, 2, true).translate(0, 0, 35).scale(scale).color(color));
p.part("flex-cell-line-3", box(734, 3, 2, true).translate(0, 86, 35).scale(scale).color(color));

return p.model();
