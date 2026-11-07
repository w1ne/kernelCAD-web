// Original kernelCAD low-poly road-switcher diesel locomotive with a long hood, raised cab, radiator grille, front lights and six wheels.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "diesel-locomotive",
  license: 'CC0-1.0',
  title: "Diesel locomotive",
  description: "Road-switcher diesel locomotive with a long hood, raised cab, radiator grille, front lights and six wheels. Knobs: overall scale and asset color.",
  tags: ["diesel locomotive", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4b555b", { label: 'Asset color' });
const p = assembly("diesel-locomotive");
p.part("frame", box(920, 300, 110, true).translate(0,0,170).scale(scale).translate(0, 0, -12).color(color));
p.part("long-hood", box(690, 270, 310, true).translate(-100,0,354).scale(scale).translate(0, 0, -12).color(color));
p.part("nose", box(250, 270, 245, true).translate(370,0,320).scale(scale).translate(0, 0, -12).color(color));
p.part("cab", box(230,290,340,true).translate(-410,0,370).scale(scale).translate(0, 0, -12).color(color));
p.part("cab-roof", box(270,330,42,true).translate(-410,0,561).scale(scale).translate(0, 0, -12).color(color));
p.part("front-grille", box(12,190,160,true).translate(251,-140,348).scale(scale).translate(0, 0, -12).color(color));
p.part("headlamp-left", cylinder(30,30,10).rotate([1,0,0],90).translate(510,-140,390).scale(scale).translate(0, 0, -12).color(color));
p.part("headlamp-right", cylinder(30,30,10).rotate([1,0,0],90).translate(510,-140,310).scale(scale).translate(0, 0, -12).color(color));
p.part("wheel-left-1", cylinder(34,98,12).rotate([1,0,0],90).translate(-300,-104,110).scale(scale).translate(0, 0, -12).color(color));
p.part("wheel-left-2", cylinder(34,98,12).rotate([1,0,0],90).translate(0,-104,110).scale(scale).translate(0, 0, -12).color(color));
p.part("wheel-left-3", cylinder(34,98,12).rotate([1,0,0],90).translate(300,-104,110).scale(scale).translate(0, 0, -12).color(color));
p.part("wheel-right-1", cylinder(34,98,12).rotate([1,0,0],90).translate(-300,138,110).scale(scale).translate(0, 0, -12).color(color));
p.part("wheel-right-2", cylinder(34,98,12).rotate([1,0,0],90).translate(0,138,110).scale(scale).translate(0, 0, -12).color(color));
p.part("wheel-right-3", cylinder(34,98,12).rotate([1,0,0],90).translate(300,138,110).scale(scale).translate(0, 0, -12).color(color));
p.part("pilot", box(120,320,40,true).rotate([0,1,0],-12).translate(522,0,75).scale(scale).translate(0, 0, -12).color(color));

return p.model();
