// Ground-mount PV rack: Tilted scene rack carrying a two-by-two group of framed solar modules
meta({
  name: 'ground-mount-pv-rack',
  license: 'CC0-1.0',
  title: 'Ground-mount PV rack',
  description: 'Tilted scene rack carrying a two-by-two group of framed solar modules. Material controls: frame aluminum, solar glass, galvanized steel.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Frame aluminum' });
const solarGlass = param('solarGlass', '#244a68', { label: 'Solar glass' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
presets({
  fieldService: { aluminum: '#a9b5b9', solarGlass: '#1e4668', galvanizedSteel: '#68787b' },
  highVisibility: { aluminum: '#d4dcdf', solarGlass: '#183a5b', galvanizedSteel: '#536367' },
});
const p = assembly("ground-mount-pv-rack");
p.part("rack-pv-frame", box(1155.6, 683.6, 22, true).translate(0, 0, 411.6).scale(scale).color(aluminum));
p.part("rack-pv-surface", box(1137.6, 665.6, 22, true).translate(0, 0, 432.6).scale(scale).color(solarGlass));
p.part("a-frame-foot-0", box(1106, 44, 32, true).translate(0, -332.8, 16).scale(scale).color(aluminum));
p.part("a-frame-upright-0", box(34, 34, 384.4, true).translate(0, -332.8, 192.2).scale(scale).color(aluminum));
p.part("a-frame-foot-1", box(1106, 44, 32, true).translate(0, 332.8, 16).scale(scale).color(aluminum));
p.part("a-frame-upright-1", box(34, 34, 384.4, true).translate(0, 332.8, 192.2).scale(scale).color(aluminum));
p.part("tracker-axis", cylinder(1264, 28, 8).rotate([0, 1, 0], 90).translate(-632, 0, 303.8).scale(scale).color(galvanizedSteel));
p.part("drive-enclosure", box(140, 110, 120, true).translate(474, 0, 90).scale(scale).color(galvanizedSteel));

return p.model();
