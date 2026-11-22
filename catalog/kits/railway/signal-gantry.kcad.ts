// Over-track signal gantry with two support towers, a crossbeam, signal heads and access walkway.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "signal-gantry",
  license: 'CC0-1.0',
  title: "Railway signal gantry",
  description: "Over-track signal gantry with two support towers, a crossbeam, signal heads and access walkway. Editable material controls: galvanized steel, painted steel, red signal glass, amber signal glass. Includes weathered and fresh service presets.",
  tags: ["signal gantry", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#929da0', { label: 'Galvanized steel' });
const paintedSteel = param('paintedSteel', '#53646c', { label: 'Painted steel' });
const signalRedGlass = param('signalRedGlass', '#cf4039', { label: 'Red signal glass' });
const signalAmberGlass = param('signalAmberGlass', '#efb438', { label: 'Amber signal glass' });
presets({
  weathered: { galvanizedSteel: '#898e8d', paintedSteel: '#5b6567', signalRedGlass: '#bc483f', signalAmberGlass: '#d6a53f' },
  freshService: { galvanizedSteel: '#aab4b4', paintedSteel: '#b74734', signalRedGlass: '#e0443a', signalAmberGlass: '#ffc12f' },
});
const p = assembly("signal-gantry");
p.part("tower-left", box(50,50,960,true).translate(-650,0,480).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("tower-right", box(50,50,960,true).translate(650,0,480).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("crossbeam", box(1360,72,80,true).translate(0,0,960).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("walkway", box(1280,190,36,true).translate(0,0,900).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("signal-left", box(150,80,250,true).translate(-380,-30,770).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("signal-right", box(150,80,250,true).translate(380,-30,770).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("lens-left", cylinder(36,42,10).rotate([1,0,0],90).translate(-380,-74,820).scale(scale).translate(0, 0, 0).color(signalRedGlass));
p.part("lens-right", cylinder(36,42,10).rotate([1,0,0],90).translate(380,-74,820).scale(scale).translate(0, 0, 0).color(signalAmberGlass));
p.part("ladder-left", box(180,28,20,true).translate(-650,0,250).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("ladder-right", box(180,28,20,true).translate(650,0,250).scale(scale).translate(0, 0, 0).color(galvanizedSteel));

return p.model();
