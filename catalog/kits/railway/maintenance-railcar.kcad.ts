// Compact maintenance railcar with an open service deck, tool cabinet, roof beacon and inspection wheels.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "maintenance-railcar",
  license: 'CC0-1.0',
  title: "Rail maintenance car",
  description: "Compact maintenance railcar with an open service deck, tool cabinet, roof beacon and inspection wheels. Editable material controls: rail and running gear steel, high-visibility paint, painted steel, amber signal glass. Includes weathered and fresh service presets.",
  tags: ["maintenance railcar", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const safetyPaint = param('safetyPaint', '#e7b735', { label: 'High-visibility paint' });
const paintedSteel = param('paintedSteel', '#53646c', { label: 'Painted steel' });
const signalAmberGlass = param('signalAmberGlass', '#efb438', { label: 'Amber signal glass' });
presets({
  weathered: { railSteel: '#666a6a', safetyPaint: '#c7a13f', paintedSteel: '#5b6567', signalAmberGlass: '#d6a53f' },
  freshService: { railSteel: '#56636a', safetyPaint: '#f5c521', paintedSteel: '#b74734', signalAmberGlass: '#ffc12f' },
});
const p = assembly("maintenance-railcar");
p.part("frame", box(900,290,90,true).translate(0,0,160).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("deck", box(950,310,45,true).translate(0,0,226).scale(scale).translate(0, 0, 2).color(safetyPaint));
p.part("cab", box(320,280,330,true).translate(-260,0,410).scale(scale).translate(0, 0, 2).color(safetyPaint));
p.part("cab-roof", box(365,320,38,true).translate(-260,0,594).scale(scale).translate(0, 0, 2).color(safetyPaint));
p.part("tool-box", box(300,210,200,true).translate(280,0,348).scale(scale).translate(0, 0, 2).color(paintedSteel));
p.part("beacon", cylinder(60,35,10).translate(-260,0,630).scale(scale).translate(0, 0, 2).color(signalAmberGlass));
p.part("wheel-left-a", cylinder(30,76,12).rotate([1,0,0],90).translate(-350,-160,74).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-left-b", cylinder(30,76,12).rotate([1,0,0],90).translate(-250,-160,74).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-right-a", cylinder(30,76,12).rotate([1,0,0],90).translate(250,-160,74).scale(scale).translate(0, 0, 2).color(railSteel));
p.part("wheel-right-b", cylinder(30,76,12).rotate([1,0,0],90).translate(350,-160,74).scale(scale).translate(0, 0, 2).color(railSteel));

return p.model();
