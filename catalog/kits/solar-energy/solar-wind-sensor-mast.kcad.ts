// Solar wind sensor mast: Slim mast with three-cup anemometer, wind vane and compact mounting base
meta({
  name: 'solar-wind-sensor-mast',
  license: 'CC0-1.0',
  title: 'Solar wind sensor mast',
  description: 'Slim mast with three-cup anemometer, wind vane and compact mounting base. Material controls: galvanized steel, frame aluminum, polymer.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Frame aluminum' });
const polymer = param('polymer', '#daddd7', { label: 'Polymer' });
presets({
  fieldService: { galvanizedSteel: '#68787b', aluminum: '#a9b5b9', polymer: '#cdd2cb' },
  highVisibility: { galvanizedSteel: '#536367', aluminum: '#d4dcdf', polymer: '#e6e0d1' },
});
const p = assembly("solar-wind-sensor-mast");
p.part("instrument-base", box(240, 225, 54, true).translate(0, 0, 27).scale(scale).color(galvanizedSteel));
p.part("instrument-mast", cylinder(1016.8, 24, 8).translate(0, 0, 54).scale(scale).color(galvanizedSteel));
p.part("wind-crossarm", box(364.8, 22, 22, true).translate(0, 0, 1041.6).scale(scale).color(aluminum));
p.part("anemometer-hub", cylinder(40, 28, 8).translate(0, 0, 1116).scale(scale).color(aluminum));
p.part("anemometer-cup-arm-0", box(140, 18, 18, true).translate(96, 0, 1178).scale(scale).color(polymer));
p.part("anemometer-cup-0", cylinder(44, 25, 8).translate(136, 0, 1165.6).scale(scale).color(polymer));
p.part("anemometer-cup-arm-1", box(140, 18, 18, true).translate(-48, 81, 1178).scale(scale).color(polymer));
p.part("anemometer-cup-1", cylinder(44, 25, 8).translate(-88, 81, 1165.6).scale(scale).color(polymer));
p.part("anemometer-cup-arm-2", box(140, 18, 18, true).translate(-48, -81, 1178).scale(scale).color(polymer));
p.part("anemometer-cup-2", cylinder(44, 25, 8).translate(-88, -81, 1165.6).scale(scale).color(polymer));
p.part("wind-vane", box(190, 22, 68, true).translate(0, 0, 1215.2).scale(scale).color(polymer));

return p.model();
