meta({
  name: 'pv-ballast-block',
  license: 'CC0-1.0',
  title: 'PV ballast block',
  description: 'Pair of weighted support blocks with short rails for a flat-roof PV module.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#827b6a', { label: 'Asset color' });
const p = assembly("pv-ballast-block");
p.part("ballast-left", box(288.8, 447.2, 135, true).translate(-212.8, 0, 67.5).scale(scale).color(color));
p.part("ballast-right", box(288.8, 447.2, 135, true).translate(212.8, 0, 67.5).scale(scale).color(color));
p.part("ballast-pv-frame", box(550, 340.4, 22, true).translate(0, 0, 249.2).scale(scale).color(color));
p.part("ballast-pv-surface", box(532, 322.4, 22, true).translate(0, 0, 270.2).scale(scale).color(color));
p.part("ballast-rail--166.4", box(623.2, 26, 26, true).translate(0, -166.4, 208.8).scale(scale).color(color));
p.part("ballast-rail-166.4", box(623.2, 26, 26, true).translate(0, 166.4, 208.8).scale(scale).color(color));

return p.model();
