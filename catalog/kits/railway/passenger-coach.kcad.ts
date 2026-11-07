// Original kernelCAD low-poly passenger rail coach with long window rows, paired bogies, end doors and roof ventilation strips.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "passenger-coach",
  license: 'CC0-1.0',
  title: "Passenger coach",
  description: "Passenger rail coach with long window rows, paired bogies, end doors and roof ventilation strips. Knobs: overall scale and asset color.",
  tags: ["passenger coach", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#657179", { label: 'Asset color' });
const p = assembly("passenger-coach");
p.part("underframe", box(1450,300,90,true).translate(0,0,190).scale(scale).translate(0, 0, -8).color(color));
p.part("body", box(1500,310,400,true).translate(0,0,430).scale(scale).translate(0, 0, -8).color(color));
p.part("roof", box(1520,330,38,true).translate(0,0,649).scale(scale).translate(0, 0, -8).color(color));
p.part("window-1", box(150,12,130,true).translate(-570,-161,470).scale(scale).translate(0, 0, -8).color(color));
p.part("window-2", box(150,12,130,true).translate(-350,-161,470).scale(scale).translate(0, 0, -8).color(color));
p.part("window-3", box(150,12,130,true).translate(-130,-161,470).scale(scale).translate(0, 0, -8).color(color));
p.part("window-4", box(150,12,130,true).translate(90,-161,470).scale(scale).translate(0, 0, -8).color(color));
p.part("window-5", box(150,12,130,true).translate(310,-161,470).scale(scale).translate(0, 0, -8).color(color));
p.part("window-6", box(150,12,130,true).translate(530,-161,470).scale(scale).translate(0, 0, -8).color(color));
p.part("door-left", box(84,14,260,true).translate(-690,-163,360).scale(scale).translate(0, 0, -8).color(color));
p.part("door-right", box(84,14,260,true).translate(690,-163,360).scale(scale).translate(0, 0, -8).color(color));
p.part("bogie-left", box(260,340,40,true).translate(-460,0,145).scale(scale).translate(0, 0, -8).color(color));
p.part("bogie-right", box(260,340,40,true).translate(460,0,145).scale(scale).translate(0, 0, -8).color(color));
p.part("wheel-left-front", cylinder(32,82,12).rotate([1,0,0],90).translate(-520,-170,90).scale(scale).translate(0, 0, -8).color(color));
p.part("wheel-left-back", cylinder(32,82,12).rotate([1,0,0],90).translate(-400,-170,90).scale(scale).translate(0, 0, -8).color(color));
p.part("wheel-right-front", cylinder(32,82,12).rotate([1,0,0],90).translate(400,-170,90).scale(scale).translate(0, 0, -8).color(color));
p.part("wheel-right-back", cylinder(32,82,12).rotate([1,0,0],90).translate(520,-170,90).scale(scale).translate(0, 0, -8).color(color));

return p.model();
