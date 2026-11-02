// Original kernelCAD low-poly three-aspect railway signal with stacked lenses, a tall mast, backboard and service ladder.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "signal-light",
  license: 'CC0-1.0',
  title: "Railway signal light",
  description: "Three-aspect railway signal with stacked lenses, a tall mast, backboard and service ladder. Knobs: overall scale and asset color.",
  tags: ["signal light", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#42484c", { label: 'Asset color' });
const p = assembly("signal-light");
p.part("mast", cylinder(1060,24,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(color));
p.part("backboard", box(180,70,430,true).translate(0,-40,790).scale(scale).translate(0, 0, 0).color(color));
p.part("lens-top", cylinder(42,58,12).rotate([1,0,0],90).translate(0,-78,930).scale(scale).translate(0, 0, 0).color(color));
p.part("lens-middle", cylinder(42,58,12).rotate([1,0,0],90).translate(0,-78,790).scale(scale).translate(0, 0, 0).color(color));
p.part("lens-bottom", cylinder(42,58,12).rotate([1,0,0],90).translate(0,-78,650).scale(scale).translate(0, 0, 0).color(color));
p.part("hood-top", box(150,60,28,true).translate(0,-80,990).scale(scale).translate(0, 0, 0).color(color));
p.part("hood-middle", box(150,60,28,true).translate(0,-80,850).scale(scale).translate(0, 0, 0).color(color));
p.part("hood-bottom", box(150,60,28,true).translate(0,-80,710).scale(scale).translate(0, 0, 0).color(color));
p.part("base", cylinder(42,72,10).translate(0,0,0).scale(scale).translate(0, 0, 0).color(color));

return p.model();
