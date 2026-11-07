// Rail crossing warning signal with paired circular lamps, protective hoods and a mounting bracket.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "crossing-warning-light",
  license: 'CC0-1.0',
  title: "Rail crossing warning light",
  description: "Rail crossing warning signal with paired circular lamps, protective hoods and a mounting bracket. Editable material controls: galvanized steel, red signal glass, amber signal glass, high-visibility paint. Includes weathered and fresh service presets.",
  tags: ["crossing warning light", "railway", "train", "station", "low poly", "CC0"],
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
const safetyPaint = param('safetyPaint', '#e7b735', { label: 'High-visibility paint' });
presets({
  weathered: { galvanizedSteel: '#898e8d', signalRedGlass: '#bc483f', signalAmberGlass: '#d6a53f', safetyPaint: '#c7a13f' },
  freshService: { galvanizedSteel: '#aab4b4', signalRedGlass: '#e0443a', signalAmberGlass: '#ffc12f', safetyPaint: '#f5c521' },
});
const p = assembly("crossing-warning-light");
p.part("post", cylinder(760,24,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("backplate", box(230,60,300,true).translate(0,-28,650).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("lamp-left", cylinder(46,72,12).rotate([1,0,0],90).translate(-55,-70,700).scale(scale).translate(0, 0, 0).color(signalRedGlass));
p.part("lamp-right", cylinder(46,72,12).rotate([1,0,0],90).translate(55,-70,700).scale(scale).translate(0, 0, 0).color(signalAmberGlass));
p.part("hood-left", box(120,70,34,true).translate(-55,-75,760).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("hood-right", box(120,70,34,true).translate(55,-75,760).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("mount", box(140,100,34,true).translate(0,0,520).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("base", cylinder(34,68,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(galvanizedSteel));

return p.model();
