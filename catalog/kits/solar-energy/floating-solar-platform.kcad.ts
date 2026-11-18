// Floating solar platform: Four-module floating PV raft carried by long buoyant pontoons and cross ties
meta({
  name: 'floating-solar-platform',
  license: 'CC0-1.0',
  title: 'Floating solar platform',
  description: 'Four-module floating PV raft carried by long buoyant pontoons and cross ties. Material controls: polymer, solar glass, galvanized steel.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#daddd7', { label: 'Polymer' });
const solarGlass = param('solarGlass', '#244a68', { label: 'Solar glass' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
presets({
  fieldService: { polymer: '#cdd2cb', solarGlass: '#1e4668', galvanizedSteel: '#68787b' },
  highVisibility: { polymer: '#e6e0d1', solarGlass: '#183a5b', galvanizedSteel: '#536367' },
});
const p = assembly("floating-solar-platform");
p.part("float-pontoon-0", cylinder(1428.8, 86, 8).rotate([0, 1, 0], 90).translate(-714.4, -129.2, 86).scale(scale).color(polymer));
p.part("float-pontoon-1", cylinder(1428.8, 86, 8).rotate([0, 1, 0], 90).translate(-714.4, 129.2, 86).scale(scale).color(polymer));
p.part("floating-module-0-0-frame", box(534.8, 314.8, 22, true).translate(-380, -243.8, 225).scale(scale).color(polymer));
p.part("floating-module-0-0-surface", box(516.8, 296.8, 22, true).translate(-380, -243.8, 246).scale(scale).color(solarGlass));
p.part("floating-module-0-1-frame", box(534.8, 314.8, 22, true).translate(-380, 243.8, 225).scale(scale).color(polymer));
p.part("floating-module-0-1-surface", box(516.8, 296.8, 22, true).translate(-380, 243.8, 246).scale(scale).color(solarGlass));
p.part("floating-module-1-0-frame", box(534.8, 314.8, 22, true).translate(380, -243.8, 225).scale(scale).color(polymer));
p.part("floating-module-1-0-surface", box(516.8, 296.8, 22, true).translate(380, -243.8, 246).scale(scale).color(solarGlass));
p.part("floating-module-1-1-frame", box(534.8, 314.8, 22, true).translate(380, 243.8, 225).scale(scale).color(polymer));
p.part("floating-module-1-1-surface", box(516.8, 296.8, 22, true).translate(380, 243.8, 246).scale(scale).color(solarGlass));
p.part("raft-cross-tie-0", box(1337.6, 34, 36, true).translate(0, -424, 125).scale(scale).color(galvanizedSteel));
p.part("raft-cross-tie-1", box(1337.6, 34, 36, true).translate(0, 424, 125).scale(scale).color(galvanizedSteel));

return p.model();
