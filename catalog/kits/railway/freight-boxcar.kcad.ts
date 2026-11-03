// Original kernelCAD low-poly enclosed freight boxcar with sliding side door, roof ribs, end ladders and two wheel bogies.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "freight-boxcar",
  license: 'CC0-1.0',
  title: "Freight boxcar",
  description: "Enclosed freight boxcar with sliding side door, roof ribs, end ladders and two wheel bogies. Knobs: overall scale and asset color.",
  tags: ["freight boxcar", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6c6152", { label: 'Asset color' });
const p = assembly("freight-boxcar");
p.part("underframe", box(1420,300,92,true).translate(0,0,170).scale(scale).translate(0, 0, 2).color(color));
p.part("box-body", box(1460,310,470,true).translate(0,0,450).scale(scale).translate(0, 0, 2).color(color));
p.part("roof", box(1490,340,45,true).translate(0,0,708).scale(scale).translate(0, 0, 2).color(color));
p.part("sliding-door", box(350,18,330,true).translate(0,-166,480).scale(scale).translate(0, 0, 2).color(color));
p.part("door-rail", box(530,24,24,true).translate(0,-178,650).scale(scale).translate(0, 0, 2).color(color));
p.part("ladder-left", box(30,24,340,true).translate(-690,-175,240).scale(scale).translate(0, 0, 2).color(color));
p.part("ladder-right", box(30,24,340,true).translate(690,-175,240).scale(scale).translate(0, 0, 2).color(color));
p.part("bogie-left", box(240,330,40,true).translate(-450,0,135).scale(scale).translate(0, 0, 2).color(color));
p.part("bogie-right", box(240,330,40,true).translate(450,0,135).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-left-a", cylinder(34,82,12).rotate([1,0,0],90).translate(-505,-170,80).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-left-b", cylinder(34,82,12).rotate([1,0,0],90).translate(-390,-170,80).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-right-a", cylinder(34,82,12).rotate([1,0,0],90).translate(390,-170,80).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-right-b", cylinder(34,82,12).rotate([1,0,0],90).translate(505,-170,80).scale(scale).translate(0, 0, 2).color(color));
p.part("coupler-front", box(120,80,52,true).translate(780,0,95).scale(scale).translate(0, 0, 2).color(color));
p.part("coupler-rear", box(120,80,52,true).translate(-780,0,95).scale(scale).translate(0, 0, 2).color(color));

return p.model();
