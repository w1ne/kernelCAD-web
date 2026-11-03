meta({
  name: 'roof-flashing-mount',
  license: 'CC0-1.0',
  title: 'Roof flashing mount',
  description: 'Low-profile roof foot with weather plate, standoff post and two mounting rails.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#8b8066', { label: 'Asset color' });
const p = assembly("roof-flashing-mount");
p.part("flashing-plate", box(480, 420, 30, true).translate(0, 0, 15).scale(scale).color(color));
p.part("standoff", box(42, 42, 231, true).translate(0, 0, 139.5).scale(scale).color(color));
p.part("mount-rail-0", box(441.6, 28, 28, true).translate(0, -126, 250.8).scale(scale).color(color));
p.part("mount-rail-1", box(441.6, 28, 28, true).translate(0, 126, 250.8).scale(scale).color(color));
p.part("rail-clamp-0", box(46, 52, 54, true).translate(-182.4, 0, 283.8).scale(scale).color(color));
p.part("rail-clamp-1", box(46, 52, 54, true).translate(182.4, 0, 283.8).scale(scale).color(color));

return p.model();
