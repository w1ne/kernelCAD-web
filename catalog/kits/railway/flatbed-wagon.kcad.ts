// Original kernelCAD low-poly rail flatbed wagon with a low deck, corner stakes, tie-down rings and two wheel bogies.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "flatbed-wagon",
  license: 'CC0-1.0',
  title: "Flatbed wagon",
  description: "Rail flatbed wagon with a low deck, corner stakes, tie-down rings and two wheel bogies. Knobs: overall scale and asset color.",
  tags: ["flatbed wagon", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#5b6265", { label: 'Asset color' });
const p = assembly("flatbed-wagon");
p.part("underframe", box(1480,300,90,true).translate(0,0,150).scale(scale).translate(0, 0, 4).color(color));
p.part("deck", box(1500,310,72,true).translate(0,0,226).scale(scale).translate(0, 0, 4).color(color));
p.part("stake-left-front", box(32,32,250,true).translate(-680,-120,380).scale(scale).translate(0, 0, 4).color(color));
p.part("stake-left-back", box(32,32,250,true).translate(-680,120,380).scale(scale).translate(0, 0, 4).color(color));
p.part("stake-right-front", box(32,32,250,true).translate(680,-120,380).scale(scale).translate(0, 0, 4).color(color));
p.part("stake-right-back", box(32,32,250,true).translate(680,120,380).scale(scale).translate(0, 0, 4).color(color));
p.part("bogie-left", box(240,320,40,true).translate(-450,0,120).scale(scale).translate(0, 0, 4).color(color));
p.part("bogie-right", box(240,320,40,true).translate(450,0,120).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-left-a", cylinder(32,78,12).rotate([1,0,0],90).translate(-505,-170,74).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-left-b", cylinder(32,78,12).rotate([1,0,0],90).translate(-390,-170,74).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-right-a", cylinder(32,78,12).rotate([1,0,0],90).translate(390,-170,74).scale(scale).translate(0, 0, 4).color(color));
p.part("wheel-right-b", cylinder(32,78,12).rotate([1,0,0],90).translate(505,-170,74).scale(scale).translate(0, 0, 4).color(color));

return p.model();
