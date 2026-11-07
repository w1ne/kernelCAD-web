// Rooftop PV array: Six framed modules arranged as a compact two-row rooftop array
meta({
  name: 'rooftop-pv-array',
  license: 'CC0-1.0',
  title: 'Rooftop PV array',
  description: 'Six framed modules arranged as a compact two-row rooftop array. Material controls: frame aluminum, solar glass, galvanized steel.',
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
const p = assembly("rooftop-pv-array");
p.part("module-0-0-frame", box(616.4, 298.8, 22, true).translate(-422.4, -259.2, 250).translate(0, 0, -7.5).scale(scale).color(aluminum));
p.part("module-0-0-surface", box(598.4, 280.8, 22, true).translate(-422.4, -259.2, 271).translate(0, 0, -7.5).scale(scale).color(solarGlass));
p.part("module-0-1-frame", box(616.4, 298.8, 22, true).translate(-422.4, 259.2, 250).translate(0, 0, -7.5).scale(scale).color(aluminum));
p.part("module-0-1-surface", box(598.4, 280.8, 22, true).translate(-422.4, 259.2, 271).translate(0, 0, -7.5).scale(scale).color(solarGlass));
p.part("module-0-2-frame", box(616.4, 298.8, 22, true).translate(-422.4, 496.8, 250).translate(0, 0, -7.5).scale(scale).color(aluminum));
p.part("module-0-2-surface", box(598.4, 280.8, 22, true).translate(-422.4, 496.8, 271).translate(0, 0, -7.5).scale(scale).color(solarGlass));
p.part("module-1-0-frame", box(616.4, 298.8, 22, true).translate(422.4, -259.2, 250).translate(0, 0, -7.5).scale(scale).color(aluminum));
p.part("module-1-0-surface", box(598.4, 280.8, 22, true).translate(422.4, -259.2, 271).translate(0, 0, -7.5).scale(scale).color(solarGlass));
p.part("module-1-1-frame", box(616.4, 298.8, 22, true).translate(422.4, 259.2, 250).translate(0, 0, -7.5).scale(scale).color(aluminum));
p.part("module-1-1-surface", box(598.4, 280.8, 22, true).translate(422.4, 259.2, 271).translate(0, 0, -7.5).scale(scale).color(solarGlass));
p.part("module-1-2-frame", box(616.4, 298.8, 22, true).translate(422.4, 496.8, 250).translate(0, 0, -7.5).scale(scale).color(aluminum));
p.part("module-1-2-surface", box(598.4, 280.8, 22, true).translate(422.4, 496.8, 271).translate(0, 0, -7.5).scale(scale).color(solarGlass));
p.part("array-rail--410-4", box(1548.8, 24, 32, true).translate(0, -410.4, 218).translate(0, 0, -7.5).scale(scale).color(galvanizedSteel));
p.part("array-rail-0", box(1548.8, 24, 32, true).translate(0, 0, 218).translate(0, 0, -7.5).scale(scale).color(galvanizedSteel));
p.part("array-rail-410-4", box(1548.8, 24, 32, true).translate(0, 410.4, 218).translate(0, 0, -7.5).scale(scale).color(galvanizedSteel));
p.part("array-post--668-8--432", box(30, 30, 195, true).translate(-668.8, -432, 105).translate(0, 0, -7.5).scale(scale).color(galvanizedSteel));
p.part("array-post--668-8-432", box(30, 30, 195, true).translate(-668.8, 432, 105).translate(0, 0, -7.5).scale(scale).color(galvanizedSteel));
p.part("array-post-668-8--432", box(30, 30, 195, true).translate(668.8, -432, 105).translate(0, 0, -7.5).scale(scale).color(galvanizedSteel));
p.part("array-post-668-8-432", box(30, 30, 195, true).translate(668.8, 432, 105).translate(0, 0, -7.5).scale(scale).color(galvanizedSteel));

return p.model();
