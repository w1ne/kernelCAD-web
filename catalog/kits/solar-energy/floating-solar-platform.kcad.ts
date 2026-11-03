meta({
  name: 'floating-solar-platform',
  license: 'CC0-1.0',
  title: 'Floating solar platform',
  description: 'Four-module floating PV raft carried by long buoyant pontoons and cross ties.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#637e87', { label: 'Asset color' });
const p = assembly("floating-solar-platform");
p.part("float-pontoon-0", cylinder(1428.8, 86, 8).rotate([0, 1, 0], 90).translate(-714.4, -129.2, 86).scale(scale).color(color));
p.part("float-pontoon-1", cylinder(1428.8, 86, 8).rotate([0, 1, 0], 90).translate(-714.4, 129.2, 86).scale(scale).color(color));
p.part("floating-module-0-0-frame", box(534.8, 314.8, 22, true).translate(-380, -243.8, 225).scale(scale).color(color));
p.part("floating-module-0-0-surface", box(516.8, 296.8, 22, true).translate(-380, -243.8, 246).scale(scale).color(color));
p.part("floating-module-0-1-frame", box(534.8, 314.8, 22, true).translate(-380, 243.8, 225).scale(scale).color(color));
p.part("floating-module-0-1-surface", box(516.8, 296.8, 22, true).translate(-380, 243.8, 246).scale(scale).color(color));
p.part("floating-module-1-0-frame", box(534.8, 314.8, 22, true).translate(380, -243.8, 225).scale(scale).color(color));
p.part("floating-module-1-0-surface", box(516.8, 296.8, 22, true).translate(380, -243.8, 246).scale(scale).color(color));
p.part("floating-module-1-1-frame", box(534.8, 314.8, 22, true).translate(380, 243.8, 225).scale(scale).color(color));
p.part("floating-module-1-1-surface", box(516.8, 296.8, 22, true).translate(380, 243.8, 246).scale(scale).color(color));
p.part("raft-cross-tie-0", box(1337.6, 34, 36, true).translate(0, -424, 125).scale(scale).color(color));
p.part("raft-cross-tie-1", box(1337.6, 34, 36, true).translate(0, 424, 125).scale(scale).color(color));

return p.model();
