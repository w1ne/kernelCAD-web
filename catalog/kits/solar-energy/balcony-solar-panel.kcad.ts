// Balcony solar panel: Compact PV panel attached to a freestanding balcony rail and support brackets
meta({
  name: 'balcony-solar-panel',
  license: 'CC0-1.0',
  title: 'Balcony solar panel',
  description: 'Compact PV panel attached to a freestanding balcony rail and support brackets. Material controls: concrete, galvanized steel, frame aluminum, solar glass.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#99968d', { label: 'Concrete' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Frame aluminum' });
const solarGlass = param('solarGlass', '#244a68', { label: 'Solar glass' });
presets({
  fieldService: { concrete: '#8b8982', galvanizedSteel: '#68787b', aluminum: '#a9b5b9', solarGlass: '#1e4668' },
  highVisibility: { concrete: '#77766f', galvanizedSteel: '#536367', aluminum: '#d4dcdf', solarGlass: '#183a5b' },
});
const p = assembly("balcony-solar-panel");
p.part("balcony-floor", box(705.6, 90, 40, true).translate(0, -145.2, 20).scale(scale).color(concrete));
p.part("balcony-post-0", box(24, 24, 448.5, true).translate(-288, -145.2, 227.7).scale(scale).color(galvanizedSteel));
p.part("balcony-post-1", box(24, 24, 448.5, true).translate(-144, -145.2, 227.7).scale(scale).color(galvanizedSteel));
p.part("balcony-post-2", box(24, 24, 448.5, true).translate(0, -145.2, 227.7).scale(scale).color(galvanizedSteel));
p.part("balcony-post-3", box(24, 24, 448.5, true).translate(144, -145.2, 227.7).scale(scale).color(galvanizedSteel));
p.part("balcony-post-4", box(24, 24, 448.5, true).translate(288, -145.2, 227.7).scale(scale).color(galvanizedSteel));
p.part("balcony-top-rail", box(720, 30, 28, true).translate(0, -145.2, 469.2).scale(scale).color(galvanizedSteel));
p.part("balcony-module-frame", box(536.4, 202.8, 22, true).translate(0, 52.8, 369.5).scale(scale).color(aluminum));
p.part("balcony-module-surface", box(518.4, 184.8, 22, true).translate(0, 52.8, 390.5).scale(scale).color(solarGlass));
p.part("balcony-bracket-0", box(34, 237.6, 28, true).translate(-230.4, 0, 207).scale(scale).color(galvanizedSteel));
p.part("balcony-bracket-1", box(34, 237.6, 28, true).translate(230.4, 0, 207).scale(scale).color(galvanizedSteel));

return p.model();
