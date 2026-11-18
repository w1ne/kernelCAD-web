// Solar pergola canopy: Compact four-post garden pergola with a four-module panel roof
meta({
  name: 'solar-pergola-canopy',
  license: 'CC0-1.0',
  title: 'Solar pergola canopy',
  description: 'Compact four-post garden pergola with a four-module panel roof. Material controls: galvanized steel, frame aluminum, solar glass.',
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
const p = assembly("solar-pergola-canopy");
p.part("canopy-post-0-0", box(54, 54, 600, true).translate(-514.8, -425.6, 300).scale(scale).color(galvanizedSteel));
p.part("canopy-post-0-1", box(54, 54, 600, true).translate(-514.8, 425.6, 300).scale(scale).color(galvanizedSteel));
p.part("canopy-post-1-0", box(54, 54, 600, true).translate(514.8, -425.6, 300).scale(scale).color(galvanizedSteel));
p.part("canopy-post-1-1", box(54, 54, 600, true).translate(514.8, 425.6, 300).scale(scale).color(galvanizedSteel));
p.part("canopy-front-beam", box(1320, 72, 64, true).translate(0, -425.6, 634).scale(scale).color(galvanizedSteel));
p.part("canopy-back-beam", box(1320, 72, 64, true).translate(0, 425.6, 634).scale(scale).color(galvanizedSteel));
p.part("canopy-pv-0-0-frame", box(348, 298, 22, true).translate(-178.2, -156.8, 680).scale(scale).color(aluminum));
p.part("canopy-pv-0-0-surface", box(330, 280, 22, true).translate(-178.2, -156.8, 701).scale(scale).color(solarGlass));
p.part("canopy-pv-0-1-frame", box(348, 298, 22, true).translate(-178.2, 156.8, 680).scale(scale).color(aluminum));
p.part("canopy-pv-0-1-surface", box(330, 280, 22, true).translate(-178.2, 156.8, 701).scale(scale).color(solarGlass));
p.part("canopy-pv-1-0-frame", box(348, 298, 22, true).translate(178.2, -156.8, 680).scale(scale).color(aluminum));
p.part("canopy-pv-1-0-surface", box(330, 280, 22, true).translate(178.2, -156.8, 701).scale(scale).color(solarGlass));
p.part("canopy-pv-1-1-frame", box(348, 298, 22, true).translate(178.2, 156.8, 680).scale(scale).color(aluminum));
p.part("canopy-pv-1-1-surface", box(330, 280, 22, true).translate(178.2, 156.8, 701).scale(scale).color(solarGlass));

return p.model();
