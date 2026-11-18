// Solar weather station: Compact instrument mast with a crossarm, sensor housings and wind vane
meta({
  name: 'solar-weather-station',
  license: 'CC0-1.0',
  title: 'Solar weather station',
  description: 'Compact instrument mast with a crossarm, sensor housings and wind vane. Material controls: galvanized steel, frame aluminum, polymer.',
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
const p = assembly("solar-weather-station");
p.part("instrument-base", box(280, 250, 54, true).translate(0, 0, 27).scale(scale).color(galvanizedSteel));
p.part("instrument-mast", cylinder(1082.4, 24, 8).translate(0, 0, 54).scale(scale).color(galvanizedSteel));
p.part("weather-crossarm", box(504, 24, 24, true).translate(0, 0, 1056).scale(scale).color(aluminum));
p.part("sensor-pod-0", box(100, 100, 100, true).translate(-190.4, 0, 1135.2).scale(scale).color(polymer));
p.part("sensor-pod-1", box(100, 100, 100, true).translate(0, 0, 1135.2).scale(scale).color(polymer));
p.part("sensor-pod-2", box(100, 100, 100, true).translate(190.4, 0, 1135.2).scale(scale).color(polymer));
p.part("wind-vane-fin", box(220, 26, 70, true).translate(0, -150, 1267.2).scale(scale).color(polymer));

return p.model();
