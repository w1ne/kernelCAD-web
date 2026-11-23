// Open-top hopper wagon with sloped discharge bays, top rails and four paired wheels.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "hopper-wagon",
  license: 'CC0-1.0',
  title: "Hopper wagon",
  description: "Open-top hopper wagon with sloped discharge bays, top rails and four paired wheels. Editable material controls: rail and running gear steel, painted steel, galvanized steel. Includes weathered and fresh service presets.",
  tags: ["hopper wagon", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#4a5358', { label: 'Painted steel' });
const galvanizedSteel = param('galvanizedSteel', '#929da0', { label: 'Galvanized steel' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#545858', galvanizedSteel: '#898e8d' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', galvanizedSteel: '#aab4b4' },
});
const p = assembly("hopper-wagon");
p.part("underframe", box(1380,300,90,true).translate(0,0,155).scale(scale).translate(0, 0, 4).color(railSteel));
p.part("hopper-body", box(1320,300,330,true).translate(0,0,390).scale(scale).translate(0, 0, 4).color(paintedSteel));
p.part("left-slope", box(520,300,230,true).rotate([0,1,0],-28).translate(-310,0,238).scale(scale).translate(0, 0, 4).color(paintedSteel));
p.part("right-slope", box(520,300,230,true).rotate([0,1,0],28).translate(310,0,238).scale(scale).translate(0, 0, 4).color(paintedSteel));
p.part("top-rail-front", box(1370,24,28,true).translate(0,-160,566).scale(scale).translate(0, 0, 4).color(galvanizedSteel));
p.part("top-rail-back", box(1370,24,28,true).translate(0,160,566).scale(scale).translate(0, 0, 4).color(galvanizedSteel));
p.part("outlet-left", box(230,180,110,true).translate(-300,0,110).scale(scale).translate(0, 0, 4).color(galvanizedSteel));
p.part("outlet-right", box(230,180,110,true).translate(300,0,110).scale(scale).translate(0, 0, 4).color(galvanizedSteel));
p.part("wheel-left-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-500,-165,74).scale(scale).translate(0, 0, 4).color(railSteel));
p.part("wheel-left-b", cylinder(30,78,12).rotate([1,0,0],90).translate(-400,-165,74).scale(scale).translate(0, 0, 4).color(railSteel));
p.part("wheel-right-a", cylinder(30,78,12).rotate([1,0,0],90).translate(400,-165,74).scale(scale).translate(0, 0, 4).color(railSteel));
p.part("wheel-right-b", cylinder(30,78,12).rotate([1,0,0],90).translate(500,-165,74).scale(scale).translate(0, 0, 4).color(railSteel));

return p.model();
