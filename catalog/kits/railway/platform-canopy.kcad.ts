// Railway platform canopy with two posts, a pitched roof, cross-braces and a sheltered bench bay.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "platform-canopy",
  license: 'CC0-1.0',
  title: "Station platform canopy",
  description: "Railway platform canopy with two posts, a pitched roof, cross-braces and a sheltered bench bay. Editable material controls: galvanized steel, painted steel. Includes weathered and fresh service presets.",
  tags: ["platform canopy", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#929da0', { label: 'Galvanized steel' });
const paintedSteel = param('paintedSteel', '#53646c', { label: 'Painted steel' });
presets({
  weathered: { galvanizedSteel: '#898e8d', paintedSteel: '#5b6567' },
  freshService: { galvanizedSteel: '#aab4b4', paintedSteel: '#b74734' },
});
const p = assembly("platform-canopy");
p.part("post-left", box(44,44,620,true).translate(-550,0,310).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("post-right", box(44,44,620,true).translate(550,0,310).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("roof-left", box(700,260,36,true).rotate([0,1,0],-8).translate(-350,0,640).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("roof-right", box(700,260,36,true).rotate([0,1,0],8).translate(350,0,640).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("ridge", box(1300,52,46,true).translate(0,0,710).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("brace-left", box(28,28,360,true).rotate([0,1,0],35).translate(-420,0,470).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("brace-right", box(28,28,360,true).rotate([0,1,0],-35).translate(420,0,470).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("gutter", box(1400,38,32,true).translate(0,-145,604).scale(scale).translate(0, 0, 0).color(paintedSteel));

return p.model();
