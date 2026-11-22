// Compact railway ticket machine with a tilted display, keypad, slot and pedestal base.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "railway-ticket-machine",
  license: 'CC0-1.0',
  title: "Station ticket machine",
  description: "Compact railway ticket machine with a tilted display, keypad, slot and pedestal base. Editable material controls: painted steel, display glass, stainless steel. Includes weathered and fresh service presets.",
  tags: ["railway ticket machine", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#51636b', { label: 'Painted steel' });
const displayGlass = param('displayGlass', '#385f77', { label: 'Display glass' });
const stainlessSteel = param('stainlessSteel', '#b8c1c2', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#596466', displayGlass: '#436171', stainlessSteel: '#a5a9a6' },
  freshService: { paintedSteel: '#b74734', displayGlass: '#417b98', stainlessSteel: '#cad2d1' },
});
const p = assembly("railway-ticket-machine");
p.part("pedestal", box(240,200,520,true).translate(0,0,260).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("housing", box(350,230,300,true).translate(0,0,650).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("display", box(230,14,125,true).rotate([0,1,0],-8).translate(0,-122,710).scale(scale).translate(0, 0, 0).color(displayGlass));
p.part("keypad", box(120,14,90,true).translate(100,-122,555).scale(scale).translate(0, 0, 0).color(stainlessSteel));
p.part("ticket-slot", box(100,14,24,true).translate(-90,-122,560).scale(scale).translate(0, 0, 0).color(stainlessSteel));
p.part("top-cap", box(370,250,32,true).translate(0,0,818).scale(scale).translate(0, 0, 0).color(paintedSteel));

return p.model();
