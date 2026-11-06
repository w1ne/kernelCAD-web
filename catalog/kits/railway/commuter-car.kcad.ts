// Short commuter rail car with wide double doors, large windows, roof air units and paired bogies.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "commuter-car",
  license: 'CC0-1.0',
  title: "Commuter rail car",
  description: "Short commuter rail car with wide double doors, large windows, roof air units and paired bogies. Editable material controls: rail and running gear steel, painted aluminum, glazing, stainless steel. Includes weathered and fresh service presets.",
  tags: ["commuter car", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const paintedAluminum = param('paintedAluminum', '#52636b', { label: 'Painted aluminum' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
const stainlessSteel = param('stainlessSteel', '#b8c1c2', { label: 'Stainless steel' });
presets({
  weathered: { railSteel: '#666a6a', paintedAluminum: '#5a6466', glass: '#5a99a7', stainlessSteel: '#a5a9a6' },
  freshService: { railSteel: '#56636a', paintedAluminum: '#28728a', glass: '#68b9ca', stainlessSteel: '#cad2d1' },
});
const p = assembly("commuter-car");
p.part("underframe", box(1260,300,90,true).translate(0,0,190).scale(scale).translate(0, 0, -10).color(railSteel));
p.part("body", box(1320,320,420,true).translate(0,0,420).scale(scale).translate(0, 0, -10).color(paintedAluminum));
p.part("roof", box(1340,340,42,true).translate(0,0,651).scale(scale).translate(0, 0, -10).color(paintedAluminum));
p.part("window-1", box(180,12,150,true).translate(-420,-166,465).scale(scale).translate(0, 0, -10).color(glass));
p.part("window-2", box(180,12,150,true).translate(-180,-166,465).scale(scale).translate(0, 0, -10).color(glass));
p.part("window-3", box(180,12,150,true).translate(180,-166,465).scale(scale).translate(0, 0, -10).color(glass));
p.part("window-4", box(180,12,150,true).translate(420,-166,465).scale(scale).translate(0, 0, -10).color(glass));
p.part("door-left", box(92,14,255,true).translate(-290,-167,360).scale(scale).translate(0, 0, -10).color(paintedAluminum));
p.part("door-right", box(92,14,255,true).translate(290,-167,360).scale(scale).translate(0, 0, -10).color(paintedAluminum));
p.part("air-unit-1", box(230,170,65,true).translate(-330,0,704).scale(scale).translate(0, 0, -10).color(stainlessSteel));
p.part("air-unit-2", box(230,170,65,true).translate(330,0,704).scale(scale).translate(0, 0, -10).color(stainlessSteel));
p.part("bogie-left", box(250,330,42,true).translate(-410,0,146).scale(scale).translate(0, 0, -10).color(railSteel));
p.part("bogie-right", box(250,330,42,true).translate(410,0,146).scale(scale).translate(0, 0, -10).color(railSteel));
p.part("wheel-left-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-465,-170,88).scale(scale).translate(0, 0, -10).color(railSteel));
p.part("wheel-left-b", cylinder(30,78,12).rotate([1,0,0],90).translate(-350,-170,88).scale(scale).translate(0, 0, -10).color(railSteel));
p.part("wheel-right-a", cylinder(30,78,12).rotate([1,0,0],90).translate(350,-170,88).scale(scale).translate(0, 0, -10).color(railSteel));
p.part("wheel-right-b", cylinder(30,78,12).rotate([1,0,0],90).translate(465,-170,88).scale(scale).translate(0, 0, -10).color(railSteel));

return p.model();
