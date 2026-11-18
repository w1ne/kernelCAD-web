// PV module with microinverter: Single framed module with a compact inverter enclosure fixed beneath its back rail
meta({
  name: 'pv-module-microinverter',
  license: 'CC0-1.0',
  title: 'PV module with microinverter',
  description: 'Single framed module with a compact inverter enclosure fixed beneath its back rail. Material controls: frame aluminum, solar glass, galvanized steel, rubber.',
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
const rubber = param('rubber', '#262c2e', { label: 'Rubber' });
presets({
  fieldService: { aluminum: '#a9b5b9', solarGlass: '#1e4668', galvanizedSteel: '#68787b', rubber: '#282d2e' },
  highVisibility: { aluminum: '#d4dcdf', solarGlass: '#183a5b', galvanizedSteel: '#536367', rubber: '#232728' },
});
const p = assembly("pv-module-microinverter");
p.part("pv-frame", box(657.6, 356.4, 22, true).translate(0, 0, 180).translate(0, 0, -32).scale(scale).color(aluminum));
p.part("pv-surface", box(639.6, 338.4, 22, true).translate(0, 0, 201).translate(0, 0, -32).scale(scale).color(solarGlass));
p.part("pv-cell-bar-x-0", box(4, 318.4, 2, true).translate(-159.9, 0, 213).translate(0, 0, -32).scale(scale).color(solarGlass));
p.part("pv-cell-bar-x-1", box(4, 318.4, 2, true).translate(0, 0, 213).translate(0, 0, -32).scale(scale).color(solarGlass));
p.part("pv-cell-bar-x-2", box(4, 318.4, 2, true).translate(159.9, 0, 213).translate(0, 0, -32).scale(scale).color(solarGlass));
p.part("pv-cell-bar-y-0", box(619.6, 4, 2, true).translate(0, -84.6, 213).translate(0, 0, -32).scale(scale).color(solarGlass));
p.part("pv-cell-bar-y-1", box(619.6, 4, 2, true).translate(0, 0, 213).translate(0, 0, -32).scale(scale).color(solarGlass));
p.part("pv-cell-bar-y-2", box(619.6, 4, 2, true).translate(0, 84.6, 213).translate(0, 0, -32).scale(scale).color(solarGlass));
p.part("rack-rail-left", box(665.6, 22, 30, true).translate(0, -115.056, 170).translate(0, 0, -32).scale(scale).color(galvanizedSteel));
p.part("rack-rail-right", box(665.6, 22, 30, true).translate(0, 115.056, 170).translate(0, 0, -32).scale(scale).color(galvanizedSteel));
p.part("rack-leg-0-0", box(28, 28, 150, true).translate(-230.256, -115.056, 107).translate(0, 0, -32).scale(scale).color(galvanizedSteel));
p.part("rack-leg-0-1", box(28, 28, 150, true).translate(-230.256, 115.056, 107).translate(0, 0, -32).scale(scale).color(galvanizedSteel));
p.part("rack-leg-1-0", box(28, 28, 150, true).translate(230.256, -115.056, 107).translate(0, 0, -32).scale(scale).color(galvanizedSteel));
p.part("rack-leg-1-1", box(28, 28, 150, true).translate(230.256, 115.056, 107).translate(0, 0, -32).scale(scale).color(galvanizedSteel));
p.part("microinverter-case", box(196.8, 103.4, 48, true).translate(0, 0, 145).translate(0, 0, -32).scale(scale).color(aluminum));
p.part("microinverter-port-left", cylinder(22, 13, 8).translate(-98.4, 0, 116).translate(0, 0, -32).scale(scale).color(rubber));
p.part("microinverter-port-right", cylinder(22, 13, 8).translate(98.4, 0, 116).translate(0, 0, -32).scale(scale).color(rubber));

return p.model();
