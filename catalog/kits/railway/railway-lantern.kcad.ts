// Vintage railway hand lantern with a faceted body, carry handle, broad base and top cap.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "railway-lantern",
  license: 'CC0-1.0',
  title: "Railway lantern",
  description: "Vintage railway hand lantern with a faceted body, carry handle, broad base and top cap. Editable material controls: painted steel, glazing, brass. Includes weathered and fresh service presets.",
  tags: ["railway lantern", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#554a3c', { label: 'Painted steel' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
const brass = param('brass', '#c29b46', { label: 'Brass' });
presets({
  weathered: { paintedSteel: '#5c5244', glass: '#5a99a7', brass: '#ac8d4b' },
  freshService: { paintedSteel: '#b74734', glass: '#68b9ca', brass: '#d3aa4d' },
});
const p = assembly("railway-lantern");
p.part("base", cylinder(34,90,10).translate(0,0,0).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("body", box(150,150,230,true).translate(0,0,150).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("globe", cylinder(60,68,10).translate(0,0,264).scale(scale).translate(0, 0, 0).color(glass));
p.part("top-cap", cylinder(32,84,10).translate(0,0,316).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("handle-left", box(20,22,150,true).rotate([0,1,0],-20).translate(-55,0,412).scale(scale).translate(0, 0, 0).color(brass));
p.part("handle-right", box(20,22,150,true).rotate([0,1,0],20).translate(55,0,412).scale(scale).translate(0, 0, 0).color(brass));
p.part("handle-top", box(120,22,24,true).translate(0,0,485).scale(scale).translate(0, 0, 0).color(brass));

return p.model();
