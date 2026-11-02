// Original kernelCAD low-poly over-track signal gantry with two support towers, a crossbeam, signal heads and access walkway.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "signal-gantry",
  license: 'CC0-1.0',
  title: "Railway signal gantry",
  description: "Over-track signal gantry with two support towers, a crossbeam, signal heads and access walkway. Knobs: overall scale and asset color.",
  tags: ["signal gantry", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#51585c", { label: 'Asset color' });
const p = assembly("signal-gantry");
p.part("tower-left", box(50,50,960,true).translate(-650,0,480).scale(scale).translate(0, 0, 0).color(color));
p.part("tower-right", box(50,50,960,true).translate(650,0,480).scale(scale).translate(0, 0, 0).color(color));
p.part("crossbeam", box(1360,72,80,true).translate(0,0,960).scale(scale).translate(0, 0, 0).color(color));
p.part("walkway", box(1280,190,36,true).translate(0,0,900).scale(scale).translate(0, 0, 0).color(color));
p.part("signal-left", box(150,80,250,true).translate(-380,-30,770).scale(scale).translate(0, 0, 0).color(color));
p.part("signal-right", box(150,80,250,true).translate(380,-30,770).scale(scale).translate(0, 0, 0).color(color));
p.part("lens-left", cylinder(36,42,10).rotate([1,0,0],90).translate(-380,-74,820).scale(scale).translate(0, 0, 0).color(color));
p.part("lens-right", cylinder(36,42,10).rotate([1,0,0],90).translate(380,-74,820).scale(scale).translate(0, 0, 0).color(color));
p.part("ladder-left", box(180,28,20,true).translate(-650,0,250).scale(scale).translate(0, 0, 0).color(color));
p.part("ladder-right", box(180,28,20,true).translate(650,0,250).scale(scale).translate(0, 0, 0).color(color));

return p.model();
