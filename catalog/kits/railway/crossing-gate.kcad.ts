// Rail crossing barrier with alternating white and yellow bands, a pivot housing, counterweight and warning lamp.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "crossing-gate",
  license: 'CC0-1.0',
  title: "Rail crossing gate",
  description: "Rail crossing barrier with alternating white and yellow bands, a pivot housing, counterweight and warning lamp. Editable material controls: galvanized steel, high-visibility paint, railway enamel, amber signal glass. Includes weathered and fresh service presets.",
  tags: ["crossing gate", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#929da0', { label: 'Galvanized steel' });
const safetyPaint = param('safetyPaint', '#e7b735', { label: 'High-visibility paint' });
const enamel = param('enamel', '#eee5cf', { label: 'Railway enamel' });
const signalAmberGlass = param('signalAmberGlass', '#efb438', { label: 'Amber signal glass' });
presets({
  weathered: { galvanizedSteel: '#898e8d', safetyPaint: '#c7a13f', enamel: '#ccc3af', signalAmberGlass: '#d6a53f' },
  freshService: { galvanizedSteel: '#aab4b4', safetyPaint: '#f5c521', enamel: '#f6eddb', signalAmberGlass: '#ffc12f' },
});
const p = assembly("crossing-gate");
p.part("base", box(180,150,38,true).translate(0,0,19).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("pivot-post", box(62,62,360,true).translate(0,0,218).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("housing", box(130,130,120,true).translate(0,0,448).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("barrier-arm", box(1100,48,48,true).rotate([0,1,0],-3).translate(580,0,520).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("barrier-stripe-1", box(82,52,52,true).rotate([0,1,0],-3).translate(190,0,520).scale(scale).translate(0, 0, 0).color(enamel));
p.part("barrier-stripe-2", box(82,52,52,true).rotate([0,1,0],-3).translate(430,0,520).scale(scale).translate(0, 0, 0).color(enamel));
p.part("barrier-stripe-3", box(82,52,52,true).rotate([0,1,0],-3).translate(670,0,520).scale(scale).translate(0, 0, 0).color(enamel));
p.part("barrier-stripe-4", box(82,52,52,true).rotate([0,1,0],-3).translate(910,0,520).scale(scale).translate(0, 0, 0).color(enamel));
p.part("counterweight", box(140,70,80,true).translate(-110,0,520).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("lamp-post", cylinder(260,18,8).translate(80,0,500).scale(scale).translate(0, 0, 0).color(galvanizedSteel));
p.part("lamp-head", box(84,62,104,true).translate(80,0,680).scale(scale).translate(0, 0, 0).color(signalAmberGlass));

return p.model();
