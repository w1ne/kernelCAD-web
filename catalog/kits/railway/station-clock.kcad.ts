// Round station clock with a marked enamel face, brass bezel, hour and minute hands, and a tall support post.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "station-clock",
  license: 'CC0-1.0',
  title: "Station clock",
  description: "Round station clock with a marked enamel face, brass bezel, hour and minute hands, and a tall support post. Editable material controls: painted steel, railway enamel, brass. Includes weathered and fresh service presets.",
  tags: ["station clock", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#6b6255', { label: 'Painted steel' });
const enamel = param('enamel', '#eee5cf', { label: 'Railway enamel' });
const brass = param('brass', '#c29b46', { label: 'Brass' });
presets({
  weathered: { paintedSteel: '#6c6356', enamel: '#ccc3af', brass: '#ac8d4b' },
  freshService: { paintedSteel: '#b74734', enamel: '#f6eddb', brass: '#d3aa4d' },
});
const p = assembly("station-clock");
p.part("post", box(48,48,620,true).translate(0,0,310).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("face", cylinder(34,180,16).rotate([1,0,0],90).translate(0,-22,700).scale(scale).translate(0, 0, 0).color(enamel));
p.part("rim", cylinder(32,198,16).subtract(cylinder(34,166,16).translate(0,0,-1)).rotate([1,0,0],90).translate(0,-14,700).scale(scale).translate(0, 0, 0).color(brass));
p.part("hour-hand", box(14,10,72,true).rotateY(-28).translate(0,-60,700).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("minute-hand", box(10,10,112,true).rotateY(38).translate(0,-60,700).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("dial-mark-top", box(10,10,24,true).translate(0,-60,850).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("dial-mark-bottom", box(10,10,24,true).translate(0,-60,550).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("dial-mark-left", box(24,10,10,true).translate(-150,-60,700).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("dial-mark-right", box(24,10,10,true).translate(150,-60,700).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("top-cap", box(240,180,38,true).translate(0,30,895).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("base", box(220,180,50,true).translate(0,0,25).scale(scale).translate(0, 0, 0).color(paintedSteel));

return p.model();
