// Trackside railway milepost with a marked enamel distance board, narrow post, cap and broad ground foot.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "milepost",
  license: 'CC0-1.0',
  title: "Railway milepost",
  description: "Trackside railway milepost with a marked enamel distance board, narrow post, cap and broad ground foot. Editable material controls: painted steel, railway enamel, concrete. Includes weathered and fresh service presets.",
  tags: ["milepost", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#515d63', { label: 'Painted steel' });
const enamel = param('enamel', '#eee5cf', { label: 'Railway enamel' });
const concrete = param('concrete', '#aaa79c', { label: 'Concrete' });
presets({
  weathered: { paintedSteel: '#596060', enamel: '#ccc3af', concrete: '#9a968a' },
  freshService: { paintedSteel: '#b74734', enamel: '#f6eddb', concrete: '#b8b4a8' },
});
const p = assembly("milepost");
p.part("post", box(46,46,720,true).translate(0,0,360).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("board", box(240,60,220,true).translate(0,0,610).scale(scale).translate(0, 0, 0).color(enamel));
p.part("distance-mark-vertical", box(14,8,78,true).translate(0,-35,610).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("distance-mark-top", box(50,8,12,true).translate(10,-35,648).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("distance-mark-bottom", box(50,8,12,true).translate(0,-35,574).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("cap", box(270,72,32,true).translate(0,0,736).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("foot", box(140,140,28,true).translate(0,0,14).scale(scale).translate(0, 0, 0).color(concrete));

return p.model();
