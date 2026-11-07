// Station ticket gate with a pedestal reader, swing flap, card sensor and side rail.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "ticket-barrier",
  license: 'CC0-1.0',
  title: "Railway ticket barrier",
  description: "Station ticket gate with a pedestal reader, swing flap, card sensor and side rail. Editable material controls: painted steel, display glass, bare aluminum. Includes weathered and fresh service presets.",
  tags: ["ticket barrier", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#50585d', { label: 'Painted steel' });
const displayGlass = param('displayGlass', '#385f77', { label: 'Display glass' });
const aluminum = param('aluminum', '#a7b2b4', { label: 'Bare aluminum' });
presets({
  weathered: { paintedSteel: '#595c5c', displayGlass: '#436171', aluminum: '#989e9b' },
  freshService: { paintedSteel: '#b74734', displayGlass: '#417b98', aluminum: '#bdc8c8' },
});
const p = assembly("ticket-barrier");
p.part("base", box(350,180,52,true).translate(0,0,26).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("pedestal", box(180,160,620,true).translate(0,0,362).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("reader", box(230,200,110,true).translate(0,0,720).scale(scale).translate(0, 0, 0).color(displayGlass));
p.part("flap", box(290,26,180,true).translate(230,0,510).scale(scale).translate(0, 0, 0).color(aluminum));
p.part("sensor", cylinder(18,26,10).translate(0,0,786).scale(scale).translate(0, 0, 0).color(displayGlass));
p.part("side-post", box(54,54,420,true).translate(-340,0,210).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("side-rail", box(720,34,36,true).translate(-170,0,390).scale(scale).translate(0, 0, 0).color(paintedSteel));

return p.model();
