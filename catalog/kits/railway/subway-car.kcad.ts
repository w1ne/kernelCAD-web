// Original kernelCAD low-poly urban subway car with a rounded-looking front cab, broad side doors and repeated passenger windows.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "subway-car",
  license: 'CC0-1.0',
  title: "Subway car",
  description: "Urban subway car with a rounded-looking front cab, broad side doors and repeated passenger windows. Knobs: overall scale and asset color.",
  tags: ["subway car", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#53636a", { label: 'Asset color' });
const p = assembly("subway-car");
p.part("underframe", box(1260,310,90,true).translate(0,0,185).scale(scale).translate(0, 0, -10).color(color));
p.part("car-body", box(1320,330,440,true).translate(0,0,425).scale(scale).translate(0, 0, -10).color(color));
p.part("front-cab", box(230,335,370,true).translate(545,0,390).scale(scale).translate(0, 0, -10).color(color));
p.part("front-window", box(14,235,150,true).translate(662,-5,505).scale(scale).translate(0, 0, -10).color(color));
p.part("roof", box(1340,350,44,true).translate(0,0,667).scale(scale).translate(0, 0, -10).color(color));
p.part("door-left", box(90,14,260,true).translate(-280,-168,370).scale(scale).translate(0, 0, -10).color(color));
p.part("door-right", box(90,14,260,true).translate(280,-168,370).scale(scale).translate(0, 0, -10).color(color));
p.part("window-left", box(170,12,145,true).translate(-500,-168,492).scale(scale).translate(0, 0, -10).color(color));
p.part("window-right", box(170,12,145,true).translate(-80,-168,492).scale(scale).translate(0, 0, -10).color(color));
p.part("window-rear", box(170,12,145,true).translate(440,-168,492).scale(scale).translate(0, 0, -10).color(color));
p.part("bogie-left", box(250,340,42,true).translate(-410,0,145).scale(scale).translate(0, 0, -10).color(color));
p.part("bogie-right", box(250,340,42,true).translate(410,0,145).scale(scale).translate(0, 0, -10).color(color));
p.part("wheel-left-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-465,-170,88).scale(scale).translate(0, 0, -10).color(color));
p.part("wheel-left-b", cylinder(30,78,12).rotate([1,0,0],90).translate(-350,-170,88).scale(scale).translate(0, 0, -10).color(color));
p.part("wheel-right-a", cylinder(30,78,12).rotate([1,0,0],90).translate(350,-170,88).scale(scale).translate(0, 0, -10).color(color));
p.part("wheel-right-b", cylinder(30,78,12).rotate([1,0,0],90).translate(465,-170,88).scale(scale).translate(0, 0, -10).color(color));

return p.model();
