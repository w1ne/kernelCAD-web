// Passenger dining car with window rows, a central galley vent, end doors and wheel bogies.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "dining-car",
  license: 'CC0-1.0',
  title: "Dining car",
  description: "Passenger dining car with window rows, a central galley vent, end doors and wheel bogies. Editable material controls: rail and running gear steel, painted steel, glazing, stainless steel. Includes weathered and fresh service presets.",
  tags: ["dining car", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#8c7650', { label: 'Painted steel' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
const stainlessSteel = param('stainlessSteel', '#b8c1c2', { label: 'Stainless steel' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#847252', glass: '#5a99a7', stainlessSteel: '#a5a9a6' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', glass: '#68b9ca', stainlessSteel: '#cad2d1' },
});
const p = assembly("dining-car");
p.part("underframe", box(1420,300,82,true).translate(0,0,162).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("body", box(1460,315,400,true).translate(0,0,430).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("roof", box(1480,340,44,true).translate(0,0,652).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("window-1", box(145,12,132,true).translate(-550,-162,474).scale(scale).translate(0, 0, 0).color(glass));
p.part("window-2", box(145,12,132,true).translate(-340,-162,474).scale(scale).translate(0, 0, 0).color(glass));
p.part("window-3", box(145,12,132,true).translate(-130,-162,474).scale(scale).translate(0, 0, 0).color(glass));
p.part("window-4", box(145,12,132,true).translate(130,-162,474).scale(scale).translate(0, 0, 0).color(glass));
p.part("window-5", box(145,12,132,true).translate(340,-162,474).scale(scale).translate(0, 0, 0).color(glass));
p.part("window-6", box(145,12,132,true).translate(550,-162,474).scale(scale).translate(0, 0, 0).color(glass));
p.part("galley-vent", box(220,150,60,true).translate(0,0,706).scale(scale).translate(0, 0, 0).color(stainlessSteel));
p.part("wheel-left-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-505,-170,78).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("wheel-left-b", cylinder(30,78,12).rotate([1,0,0],90).translate(-390,-170,78).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("wheel-right-a", cylinder(30,78,12).rotate([1,0,0],90).translate(390,-170,78).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("wheel-right-b", cylinder(30,78,12).rotate([1,0,0],90).translate(505,-170,78).scale(scale).translate(0, 0, 0).color(railSteel));

return p.model();
