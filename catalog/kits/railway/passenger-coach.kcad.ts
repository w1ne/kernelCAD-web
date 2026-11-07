// Passenger rail coach with long window rows, paired bogies, end doors and roof ventilation strips.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "passenger-coach",
  license: 'CC0-1.0',
  title: "Passenger coach",
  description: "Passenger rail coach with long window rows, paired bogies, end doors and roof ventilation strips. Editable material controls: rail and running gear steel, painted steel, glazing. Includes weathered and fresh service presets.",
  tags: ["passenger coach", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#657179', { label: 'Painted steel' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#686e70', glass: '#5a99a7' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', glass: '#68b9ca' },
});
const p = assembly("passenger-coach");
p.part("underframe", box(1450,300,90,true).translate(0,0,190).scale(scale).translate(0, 0, -8).color(railSteel));
p.part("body", box(1500,310,400,true).translate(0,0,430).scale(scale).translate(0, 0, -8).color(paintedSteel));
p.part("roof", box(1520,330,38,true).translate(0,0,649).scale(scale).translate(0, 0, -8).color(paintedSteel));
p.part("window-1", box(150,12,130,true).translate(-570,-161,470).scale(scale).translate(0, 0, -8).color(glass));
p.part("window-2", box(150,12,130,true).translate(-350,-161,470).scale(scale).translate(0, 0, -8).color(glass));
p.part("window-3", box(150,12,130,true).translate(-130,-161,470).scale(scale).translate(0, 0, -8).color(glass));
p.part("window-4", box(150,12,130,true).translate(90,-161,470).scale(scale).translate(0, 0, -8).color(glass));
p.part("window-5", box(150,12,130,true).translate(310,-161,470).scale(scale).translate(0, 0, -8).color(glass));
p.part("window-6", box(150,12,130,true).translate(530,-161,470).scale(scale).translate(0, 0, -8).color(glass));
p.part("door-left", box(84,14,260,true).translate(-690,-163,360).scale(scale).translate(0, 0, -8).color(paintedSteel));
p.part("door-right", box(84,14,260,true).translate(690,-163,360).scale(scale).translate(0, 0, -8).color(paintedSteel));
p.part("bogie-left", box(260,340,40,true).translate(-460,0,145).scale(scale).translate(0, 0, -8).color(railSteel));
p.part("bogie-right", box(260,340,40,true).translate(460,0,145).scale(scale).translate(0, 0, -8).color(railSteel));
p.part("wheel-left-front", cylinder(32,82,12).rotate([1,0,0],90).translate(-520,-170,90).scale(scale).translate(0, 0, -8).color(railSteel));
p.part("wheel-left-back", cylinder(32,82,12).rotate([1,0,0],90).translate(-400,-170,90).scale(scale).translate(0, 0, -8).color(railSteel));
p.part("wheel-right-front", cylinder(32,82,12).rotate([1,0,0],90).translate(400,-170,90).scale(scale).translate(0, 0, -8).color(railSteel));
p.part("wheel-right-back", cylinder(32,82,12).rotate([1,0,0],90).translate(520,-170,90).scale(scale).translate(0, 0, -8).color(railSteel));

return p.model();
