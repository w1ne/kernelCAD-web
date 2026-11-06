// Short railway caboose with a raised cupola, end platforms, side windows and four wheels.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "caboose",
  license: 'CC0-1.0',
  title: "Caboose",
  description: "Short railway caboose with a raised cupola, end platforms, side windows and four wheels. Editable material controls: rail and running gear steel, painted steel, glazing. Includes weathered and fresh service presets.",
  tags: ["caboose", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#a35c42', { label: 'Painted steel' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#955f48', glass: '#5a99a7' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', glass: '#68b9ca' },
});
const p = assembly("caboose");
p.part("underframe", box(950,300,82,true).translate(0,0,154).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("body", box(940,310,380,true).translate(0,0,420).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("roof", box(1000,360,50,true).translate(0,0,635).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("cupola", box(330,230,185,true).translate(0,0,735).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("cupola-roof", box(380,270,36,true).translate(0,0,844).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("window-left", box(130,12,120,true).translate(-290,-158,465).scale(scale).translate(0, 0, 2).color(glass));
p.part("window-right", box(130,12,120,true).translate(290,-158,465).scale(scale).translate(0, 0, 2).color(glass));
p.part("platform-left", box(120,360,35,true).translate(-520,0,260).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("platform-right", box(120,360,35,true).translate(520,0,260).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("wheel-left-a", cylinder(32,80,12).rotate([1,0,0],90).translate(-355,-170,78).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-left-b", cylinder(32,80,12).rotate([1,0,0],90).translate(-245,-170,78).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-right-a", cylinder(32,80,12).rotate([1,0,0],90).translate(245,-170,78).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-right-b", cylinder(32,80,12).rotate([1,0,0],90).translate(355,-170,78).scale(scale).translate(0, 0, 2).color(railSteel));

return p.model();
