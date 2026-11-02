// Original kernelCAD low-poly passenger dining car with window rows, a central galley vent, end doors and wheel bogies.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "dining-car",
  license: 'CC0-1.0',
  title: "Dining car",
  description: "Passenger dining car with window rows, a central galley vent, end doors and wheel bogies. Knobs: overall scale and asset color.",
  tags: ["dining car", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#8c7650", { label: 'Asset color' });
const p = assembly("dining-car");
p.part("underframe", box(1420,300,82,true).translate(0,0,162).scale(scale).translate(0, 0, 0).color(color));
p.part("body", box(1460,315,400,true).translate(0,0,430).scale(scale).translate(0, 0, 0).color(color));
p.part("roof", box(1480,340,44,true).translate(0,0,652).scale(scale).translate(0, 0, 0).color(color));
p.part("window-1", box(145,12,132,true).translate(-550,-162,474).scale(scale).translate(0, 0, 0).color(color));
p.part("window-2", box(145,12,132,true).translate(-340,-162,474).scale(scale).translate(0, 0, 0).color(color));
p.part("window-3", box(145,12,132,true).translate(-130,-162,474).scale(scale).translate(0, 0, 0).color(color));
p.part("window-4", box(145,12,132,true).translate(130,-162,474).scale(scale).translate(0, 0, 0).color(color));
p.part("window-5", box(145,12,132,true).translate(340,-162,474).scale(scale).translate(0, 0, 0).color(color));
p.part("window-6", box(145,12,132,true).translate(550,-162,474).scale(scale).translate(0, 0, 0).color(color));
p.part("galley-vent", box(220,150,60,true).translate(0,0,706).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-left-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-505,-170,78).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-left-b", cylinder(30,78,12).rotate([1,0,0],90).translate(-390,-170,78).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-right-a", cylinder(30,78,12).rotate([1,0,0],90).translate(390,-170,78).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-right-b", cylinder(30,78,12).rotate([1,0,0],90).translate(505,-170,78).scale(scale).translate(0, 0, 0).color(color));

return p.model();
