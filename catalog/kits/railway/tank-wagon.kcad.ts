// Original kernelCAD low-poly cylindrical tank wagon with domed end caps, a top walkway, ladder and twin bogies.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "tank-wagon",
  license: 'CC0-1.0',
  title: "Rail tank wagon",
  description: "Cylindrical tank wagon with domed end caps, a top walkway, ladder and twin bogies. Knobs: overall scale and asset color.",
  tags: ["tank wagon", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#555d62", { label: 'Asset color' });
const p = assembly("tank-wagon");
p.part("underframe", box(1500,300,82,true).translate(0,0,164).scale(scale).translate(0, 0, 4).color(color));
p.part("tank", cylinder(1120,180,14).rotate([0,1,0],90).translate(-560,0,430).scale(scale).translate(0, 0, 4).color(color));
p.part("tank-cap-left", sphere(180).scale([0.34,1,1]).translate(-560,0,430).scale(scale).translate(0, 0, 4).color(color));
p.part("tank-cap-right", sphere(180).scale([0.34,1,1]).translate(560,0,430).scale(scale).translate(0, 0, 4).color(color));
p.part("top-hatch", cylinder(55,70,12).translate(0,0,604).scale(scale).translate(0, 0, 4).color(color));
p.part("walkway", box(600,90,24,true).translate(0,0,626).scale(scale).translate(0, 0, 4).color(color));
p.part("ladder", box(28,24,360,true).translate(520,-166,276).scale(scale).translate(0, 0, 4).color(color));
p.part("bogie-left", box(230,320,36,true).translate(-450,0,120).scale(scale).translate(0, 0, 4).color(color));
p.part("bogie-right", box(230,320,36,true).translate(450,0,120).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-left-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-500,-165,74).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-left-b", cylinder(30,78,12).rotate([1,0,0],90).translate(-400,-165,74).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-right-a", cylinder(30,78,12).rotate([1,0,0],90).translate(400,-165,74).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-right-b", cylinder(30,78,12).rotate([1,0,0],90).translate(500,-165,74).scale(scale).translate(0, 0, 4).color(color));

return p.model();
