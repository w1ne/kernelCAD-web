// Battery rack: Open four-level equipment rack carrying six modular storage blocks
meta({
  name: 'battery-rack',
  license: 'CC0-1.0',
  title: 'Battery rack',
  description: 'Open four-level equipment rack carrying six modular storage blocks. Material controls: galvanized steel, battery polymer.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
const batteryPolymer = param('batteryPolymer', '#3b5d65', { label: 'Battery polymer' });
presets({
  fieldService: { galvanizedSteel: '#68787b', batteryPolymer: '#354b51' },
  highVisibility: { galvanizedSteel: '#536367', batteryPolymer: '#34745f' },
});
const p = assembly("battery-rack");
p.part("rack-upright--369-6", box(36, 36, 1380, true).translate(-369.6, 0, 690).scale(scale).color(galvanizedSteel));
p.part("rack-upright-369-6", box(36, 36, 1380, true).translate(369.6, 0, 690).scale(scale).color(galvanizedSteel));
p.part("rack-shelf-0", box(880, 520, 42, true).translate(0, 0, 110).scale(scale).color(galvanizedSteel));
p.part("battery-0-0", box(334.4, 374.4, 210, true).translate(-220, 0, 236).scale(scale).color(batteryPolymer));
p.part("battery-0-1", box(334.4, 374.4, 210, true).translate(220, 0, 236).scale(scale).color(batteryPolymer));
p.part("rack-shelf-1", box(880, 520, 42, true).translate(0, 0, 486.667).scale(scale).color(galvanizedSteel));
p.part("battery-1-0", box(334.4, 374.4, 210, true).translate(-220, 0, 612.667).scale(scale).color(batteryPolymer));
p.part("battery-1-1", box(334.4, 374.4, 210, true).translate(220, 0, 612.667).scale(scale).color(batteryPolymer));
p.part("rack-shelf-2", box(880, 520, 42, true).translate(0, 0, 863.333).scale(scale).color(galvanizedSteel));
p.part("battery-2-0", box(334.4, 374.4, 210, true).translate(-220, 0, 989.333).scale(scale).color(batteryPolymer));
p.part("battery-2-1", box(334.4, 374.4, 210, true).translate(220, 0, 989.333).scale(scale).color(batteryPolymer));
p.part("rack-shelf-3", box(880, 520, 42, true).translate(0, 0, 1240).scale(scale).color(galvanizedSteel));
p.part("battery-3-0", box(334.4, 374.4, 210, true).translate(-220, 0, 1366).scale(scale).color(batteryPolymer));
p.part("battery-3-1", box(334.4, 374.4, 210, true).translate(220, 0, 1366).scale(scale).color(batteryPolymer));

return p.model();
