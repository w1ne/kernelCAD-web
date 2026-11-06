// Microinverter unit: Compact sealed microinverter case with mounting ears, cooling fins and cable ends
meta({
  name: 'microinverter-unit',
  license: 'CC0-1.0',
  title: 'Microinverter unit',
  description: 'Compact sealed microinverter case with mounting ears, cooling fins and cable ends. Material controls: powder-coated steel, stainless steel, frame aluminum, rubber.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#687c7c', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#c3caca', { label: 'Stainless steel' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Frame aluminum' });
const rubber = param('rubber', '#262c2e', { label: 'Rubber' });
presets({
  fieldService: { powderCoat: '#7a807b', stainlessSteel: '#abb5b7', aluminum: '#a9b5b9', rubber: '#282d2e' },
  highVisibility: { powderCoat: '#d1722b', stainlessSteel: '#e0e5e4', aluminum: '#d4dcdf', rubber: '#232728' },
});
const p = assembly("microinverter-unit");
p.part("microinverter-body", box(235.6, 155.8, 75.6, true).translate(0, 0, 44.1).translate(0, 0, -6.3).scale(scale).color(powderCoat));
p.part("heat-fin-0", box(223.2, 12, 8, true).translate(0, -60.8, 90.3).translate(0, 0, -6.3).scale(scale).color(stainlessSteel));
p.part("heat-fin-1", box(223.2, 12, 8, true).translate(0, -30.4, 90.3).translate(0, 0, -6.3).scale(scale).color(stainlessSteel));
p.part("heat-fin-2", box(223.2, 12, 8, true).translate(0, 0, 90.3).translate(0, 0, -6.3).scale(scale).color(stainlessSteel));
p.part("heat-fin-3", box(223.2, 12, 8, true).translate(0, 30.4, 90.3).translate(0, 0, -6.3).scale(scale).color(stainlessSteel));
p.part("heat-fin-4", box(223.2, 12, 8, true).translate(0, 60.8, 90.3).translate(0, 0, -6.3).scale(scale).color(stainlessSteel));
p.part("mount-ear-0", box(48, 85.5, 18, true).translate(-124, 0, 25).translate(0, 0, -6.3).scale(scale).color(aluminum));
p.part("mount-ear-1", box(48, 85.5, 18, true).translate(124, 0, 25).translate(0, 0, -6.3).scale(scale).color(aluminum));
p.part("lead-0", cylinder(68.2, 11, 8).rotate([0, 1, 0], 90).translate(-86.8, 0, 18).translate(0, 0, -6.3).scale(scale).color(rubber));
p.part("lead-1", cylinder(68.2, 11, 8).rotate([0, 1, 0], 90).translate(86.8, 0, 18).translate(0, 0, -6.3).scale(scale).color(rubber));

return p.model();
