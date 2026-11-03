// Original kernelCAD low-poly compact maintenance railcar with an open service deck, tool cabinet, roof beacon and inspection wheels.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "maintenance-railcar",
  license: 'CC0-1.0',
  title: "Rail maintenance car",
  description: "Compact maintenance railcar with an open service deck, tool cabinet, roof beacon and inspection wheels. Knobs: overall scale and asset color.",
  tags: ["maintenance railcar", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#59645e", { label: 'Asset color' });
const p = assembly("maintenance-railcar");
p.part("frame", box(900,290,90,true).translate(0,0,160).scale(scale).translate(0, 0, 2).color(color));
p.part("deck", box(950,310,45,true).translate(0,0,226).scale(scale).translate(0, 0, 2).color(color));
p.part("cab", box(320,280,330,true).translate(-260,0,410).scale(scale).translate(0, 0, 2).color(color));
p.part("cab-roof", box(365,320,38,true).translate(-260,0,594).scale(scale).translate(0, 0, 2).color(color));
p.part("tool-box", box(300,210,200,true).translate(280,0,348).scale(scale).translate(0, 0, 2).color(color));
p.part("beacon", cylinder(60,35,10).translate(-260,0,630).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-left-a", cylinder(30,76,12).rotate([1,0,0],90).translate(-350,-160,74).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-left-b", cylinder(30,76,12).rotate([1,0,0],90).translate(-250,-160,74).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-right-a", cylinder(30,76,12).rotate([1,0,0],90).translate(250,-160,74).scale(scale).translate(0, 0, 2).color(color));
p.part("wheel-right-b", cylinder(30,76,12).rotate([1,0,0],90).translate(350,-160,74).scale(scale).translate(0, 0, 2).color(color));

return p.model();
