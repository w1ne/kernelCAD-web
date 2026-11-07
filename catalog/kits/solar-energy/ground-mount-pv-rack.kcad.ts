meta({
  name: 'ground-mount-pv-rack',
  license: 'CC0-1.0',
  title: 'Ground-mount PV rack',
  description: 'Tilted scene rack carrying a two-by-two group of framed solar modules.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#6c8790', { label: 'Asset color' });
const p = assembly("ground-mount-pv-rack");
p.part("rack-pv-frame", box(1155.6, 683.6, 22, true).translate(0, 0, 411.6).scale(scale).color(color));
p.part("rack-pv-surface", box(1137.6, 665.6, 22, true).translate(0, 0, 432.6).scale(scale).color(color));
p.part("a-frame-foot-0", box(1106, 44, 32, true).translate(0, -332.8, 16).scale(scale).color(color));
p.part("a-frame-upright-0", box(34, 34, 384.4, true).translate(0, -332.8, 192.2).scale(scale).color(color));
p.part("a-frame-foot-1", box(1106, 44, 32, true).translate(0, 332.8, 16).scale(scale).color(color));
p.part("a-frame-upright-1", box(34, 34, 384.4, true).translate(0, 332.8, 192.2).scale(scale).color(color));
p.part("tracker-axis", cylinder(1264, 28, 8).rotate([0, 1, 0], 90).translate(-632, 0, 303.8).scale(scale).color(color));
p.part("drive-enclosure", box(140, 110, 120, true).translate(474, 0, 90).scale(scale).color(color));

return p.model();
