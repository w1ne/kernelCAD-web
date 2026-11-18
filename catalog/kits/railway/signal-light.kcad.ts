// Three-aspect railway signal with stacked lenses, a tall mast, backboard and service ladder.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "signal-light",
  license: 'CC0-1.0',
  title: "Railway signal light",
  description: "Three-aspect railway signal with stacked lenses, a tall mast, backboard and service ladder. Editable material controls: galvanized steel, red signal glass, amber signal glass, green signal glass. Includes weathered and fresh service presets.",
  tags: ["signal light", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#929da0', { label: 'Galvanized steel' });
const signalRedGlass = param('signalRedGlass', '#cf4039', { label: 'Red signal glass' });
const signalAmberGlass = param('signalAmberGlass', '#efb438', { label: 'Amber signal glass' });
const signalGreenGlass = param('signalGreenGlass', '#42935f', { label: 'Green signal glass' });
presets({
  weathered: { galvanizedSteel: '#898e8d', signalRedGlass: '#bc483f', signalAmberGlass: '#d6a53f', signalGreenGlass: '#4b8a5e' },
  freshService: { galvanizedSteel: '#aab4b4', signalRedGlass: '#e0443a', signalAmberGlass: '#ffc12f', signalGreenGlass: '#32a05e' },
});
const p = assembly("signal-light");
p.part("mast", cylinder(1060,24,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("backboard", box(180,70,430,true).translate(0,-40,790).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("lens-top", cylinder(42,58,12).rotate([1,0,0],90).translate(0,-78,930).scale(scale).translate(0, 0, 0).color(signalRedGlass));
p.part("lens-middle", cylinder(42,58,12).rotate([1,0,0],90).translate(0,-78,790).scale(scale).translate(0, 0, 0).color(signalAmberGlass));
p.part("lens-bottom", cylinder(42,58,12).rotate([1,0,0],90).translate(0,-78,650).scale(scale).translate(0, 0, 0).color(signalGreenGlass));
p.part("hood-top", box(150,60,28,true).translate(0,-80,990).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("hood-middle", box(150,60,28,true).translate(0,-80,850).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("hood-bottom", box(150,60,28,true).translate(0,-80,710).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("base", cylinder(42,72,10).translate(0,0,0).scale(scale).translate(0, 0, 0).color(galvanizedSteel));

return p.model();
