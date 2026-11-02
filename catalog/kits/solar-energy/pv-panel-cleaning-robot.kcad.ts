meta({
  name: 'pv-panel-cleaning-robot',
  license: 'CC0-1.0',
  title: 'PV panel cleaning robot',
  description: 'Compact tracked cleaning carriage spanning two panel rails with a broad brush bar.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#a57b48', { label: 'Asset color' });
const p = assembly("pv-panel-cleaning-robot");
p.part("cleaning-robot-body", box(426.4, 224.4, 104.5, true).translate(0, 0, 95).scale(scale).color(color));
p.part("robot-track--138.6", box(478.4, 34, 42, true).translate(0, -138.6, 30).scale(scale).color(color));
p.part("robot-track-138.6", box(478.4, 34, 42, true).translate(0, 138.6, 30).scale(scale).color(color));
p.part("brush-shaft", cylinder(478.4, 22, 8).rotate([0, 1, 0], 90).translate(-239.2, 0, 12).scale(scale).color(color));
p.part("brush-bar", box(468, 36, 34, true).translate(0, 118.8, 20).scale(scale).color(color));
p.part("handle-rail", box(291.2, 24, 28, true).translate(-130, 0, 167.2).scale(scale).color(color));

return p.model();
