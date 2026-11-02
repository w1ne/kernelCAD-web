// Original kernelCAD low-poly mechanical railway semaphore with a tall mast, pivot arm, counterweight and ladder rungs.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "semaphore-signal",
  license: 'CC0-1.0',
  title: "Railway semaphore signal",
  description: "Mechanical railway semaphore with a tall mast, pivot arm, counterweight and ladder rungs. Knobs: overall scale and asset color.",
  tags: ["semaphore signal", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#5a6063", { label: 'Asset color' });
const p = assembly("semaphore-signal");
p.part("mast", cylinder(980,24,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(color));
p.part("base", cylinder(48,70,10).translate(0,0,0).scale(scale).translate(0, 0, 0).color(color));
p.part("arm", box(360,34,40,true).translate(185,0,860).scale(scale).translate(0, 0, 0).color(color));
p.part("arm-tip", box(72,42,54,true).translate(350,0,860).scale(scale).translate(0, 0, 0).color(color));
p.part("counterweight", box(110,58,74,true).translate(-74,0,860).scale(scale).translate(0, 0, 0).color(color));
p.part("pivot", cylinder(60,44,10).rotate([1,0,0],90).translate(0,-16,860).scale(scale).translate(0, 0, 0).color(color));
p.part("ladder-1", box(140,24,20,true).translate(0,0,190).scale(scale).translate(0, 0, 0).color(color));
p.part("ladder-2", box(140,24,20,true).translate(0,0,310).scale(scale).translate(0, 0, 0).color(color));
p.part("ladder-3", box(140,24,20,true).translate(0,0,430).scale(scale).translate(0, 0, 0).color(color));
p.part("ladder-4", box(140,24,20,true).translate(0,0,550).scale(scale).translate(0, 0, 0).color(color));

return p.model();
