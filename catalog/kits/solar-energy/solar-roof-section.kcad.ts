// Solar roof section: Small pitched-roof display with framed panels, ridge cap and two mounting rails
meta({
  name: 'solar-roof-section',
  license: 'CC0-1.0',
  title: 'Solar roof section',
  description: 'Small pitched-roof display with framed panels, ridge cap and two mounting rails. Material controls: galvanized steel, frame aluminum, solar glass.',
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
const solarGlass = param('solarGlass', '#244a68', { label: 'Solar glass' });
presets({
  fieldService: { galvanizedSteel: '#68787b', aluminum: '#a9b5b9', solarGlass: '#1e4668' },
  highVisibility: { galvanizedSteel: '#536367', aluminum: '#d4dcdf', solarGlass: '#183a5b' },
});
const p = assembly("solar-roof-section");
p.part("roof-deck", box(1180, 820, 64, true).translate(0, 0, 50).translate(0, 0, -18).scale(scale).color(galvanizedSteel));
p.part("ridge-cap", box(1204, 52, 50, true).translate(0, 0, 116).translate(0, 0, -18).scale(scale).color(galvanizedSteel));
p.part("roof-module-0-frame", box(395.6, 362.4, 22, true).translate(-318.6, -98.4, 210).translate(0, 0, -18).scale(scale).color(aluminum));
p.part("roof-module-0-surface", box(377.6, 344.4, 22, true).translate(-318.6, -98.4, 231).translate(0, 0, -18).scale(scale).color(solarGlass));
p.part("roof-module-1-frame", box(395.6, 362.4, 22, true).translate(318.6, -98.4, 210).translate(0, 0, -18).scale(scale).color(aluminum));
p.part("roof-module-1-surface", box(377.6, 344.4, 22, true).translate(318.6, -98.4, 231).translate(0, 0, -18).scale(scale).color(solarGlass));
p.part("roof-rail-0", box(991.2, 30, 24, true).translate(0, -246, 144).translate(0, 0, -18).scale(scale).color(galvanizedSteel));
p.part("roof-rail-1", box(991.2, 30, 24, true).translate(0, 246, 144).translate(0, 0, -18).scale(scale).color(galvanizedSteel));

return p.model();
