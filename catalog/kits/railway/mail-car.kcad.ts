// Railway mail car with long sorting windows, sliding cargo doors, roof vents and paired bogies.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "mail-car",
  license: 'CC0-1.0',
  title: "Railway mail car",
  description: "Railway mail car with long sorting windows, sliding cargo doors, roof vents and paired bogies. Editable material controls: rail and running gear steel, painted steel, glazing, bare aluminum. Includes weathered and fresh service presets.",
  tags: ["mail car", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#566879', { label: 'Painted steel' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
const aluminum = param('aluminum', '#a7b2b4', { label: 'Bare aluminum' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#5d6870', glass: '#5a99a7', aluminum: '#989e9b' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', glass: '#68b9ca', aluminum: '#bdc8c8' },
});
const p = assembly("mail-car");
p.part("underframe", box(1380,300,82,true).translate(0,0,162).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("body", box(1420,310,430,true).translate(0,0,420).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("roof", box(1450,330,42,true).translate(0,0,656).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("door-left", box(260,16,320,true).translate(-300,-163,428).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("door-right", box(260,16,320,true).translate(300,-163,428).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("window-a", box(115,12,100,true).translate(-590,-163,500).scale(scale).translate(0, 0, 2).color(glass));
p.part("window-b", box(115,12,100,true).translate(590,-163,500).scale(scale).translate(0, 0, 2).color(glass));
p.part("vent-a", box(150,120,42,true).translate(-250,0,700).scale(scale).translate(0, 0, 2).color(aluminum));
p.part("vent-b", box(150,120,42,true).translate(250,0,700).scale(scale).translate(0, 0, 2).color(aluminum));
p.part("wheel-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-500,-170,76).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-b", cylinder(30,78,12).rotate([1,0,0],90).translate(-400,-170,76).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-c", cylinder(30,78,12).rotate([1,0,0],90).translate(400,-170,76).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-d", cylinder(30,78,12).rotate([1,0,0],90).translate(500,-170,76).scale(scale).translate(0, 0, 2).color(railSteel));

return p.model();
