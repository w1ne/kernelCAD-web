// Mechanical railway semaphore with a tall mast, pivot arm, counterweight and ladder rungs.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "semaphore-signal",
  license: 'CC0-1.0',
  title: "Railway semaphore signal",
  description: "Mechanical railway semaphore with a tall mast, pivot arm, counterweight and ladder rungs. Editable material controls: painted steel, high-visibility paint, brass, galvanized steel. Includes weathered and fresh service presets.",
  tags: ["semaphore signal", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#5a6063', { label: 'Painted steel' });
const safetyPaint = param('safetyPaint', '#e7b735', { label: 'High-visibility paint' });
const brass = param('brass', '#c29b46', { label: 'Brass' });
const galvanizedSteel = param('galvanizedSteel', '#929da0', { label: 'Galvanized steel' });
presets({
  weathered: { paintedSteel: '#606260', safetyPaint: '#c7a13f', brass: '#ac8d4b', galvanizedSteel: '#898e8d' },
  freshService: { paintedSteel: '#b74734', safetyPaint: '#f5c521', brass: '#d3aa4d', galvanizedSteel: '#aab4b4' },
});
const p = assembly("semaphore-signal");
p.part("mast", cylinder(980,24,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("base", cylinder(48,70,10).translate(0,0,0).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("arm", box(360,34,40,true).translate(185,0,860).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("arm-tip", box(72,42,54,true).translate(350,0,860).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("counterweight", box(110,58,74,true).translate(-74,0,860).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("pivot", cylinder(60,44,10).rotate([1,0,0],90).translate(0,-16,860).scale(scale).translate(0, 0, 0).color(brass));
p.part("ladder-1", box(140,24,20,true).translate(0,0,190).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("ladder-2", box(140,24,20,true).translate(0,0,310).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("ladder-3", box(140,24,20,true).translate(0,0,430).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("ladder-4", box(140,24,20,true).translate(0,0,550).scale(scale).translate(0, 0, 0).color(galvanizedSteel));

return p.model();
