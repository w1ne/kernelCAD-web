// Solar electric meter: Meter pedestal with a round meter face, upper enclosure and conduit base
meta({
  name: 'solar-electric-meter',
  license: 'CC0-1.0',
  title: 'Solar electric meter',
  description: 'Meter pedestal with a round meter face, upper enclosure and conduit base. Material controls: galvanized steel, polymer, frame aluminum, display glass.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
const polymer = param('polymer', '#daddd7', { label: 'Polymer' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Frame aluminum' });
const displayGlass = param('displayGlass', '#24515d', { label: 'Display glass' });
presets({
  fieldService: { galvanizedSteel: '#68787b', polymer: '#cdd2cb', aluminum: '#a9b5b9', displayGlass: '#376a73' },
  highVisibility: { galvanizedSteel: '#536367', polymer: '#e6e0d1', aluminum: '#d4dcdf', displayGlass: '#167d95' },
});
const p = assembly("solar-electric-meter");
p.part("instrument-base", box(180, 130, 54, true).translate(0, 0, 27).scale(scale).color(galvanizedSteel));
p.part("instrument-mast", cylinder(717.6, 24, 8).translate(0, 0, 54).scale(scale).color(galvanizedSteel));
p.part("meter-enclosure", box(316.8, 187.2, 340.4, true).translate(0, 0, 625.6).scale(scale).color(polymer));
p.part("meter-ring", cylinder(36, 72, 8).rotate([1, 0, 0], 90).translate(0, 119.2, 625.6).scale(scale).color(aluminum));
p.part("meter-face", cylinder(12, 57.6, 8).rotate([1, 0, 0], 90).translate(0, 108.2, 625.6).scale(scale).color(displayGlass));

return p.model();
