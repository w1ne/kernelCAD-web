// Original kernelCAD low-poly trackside railway milepost with a tapered-looking marker board, narrow post and broad ground foot.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "milepost",
  license: 'CC0-1.0',
  title: "Railway milepost",
  description: "Trackside railway milepost with a tapered-looking marker board, narrow post and broad ground foot. Knobs: overall scale and asset color.",
  tags: ["milepost", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#efe6cf", { label: 'Asset color' });
const p = assembly("milepost");
p.part("post", box(46,46,720,true).translate(0,0,360).scale(scale).translate(0, 0, 0).color(color));
p.part("board", box(240,60,220,true).translate(0,0,610).scale(scale).translate(0, 0, 0).color(color));
p.part("cap", box(270,72,32,true).translate(0,0,736).scale(scale).translate(0, 0, 0).color(color));
p.part("foot", box(140,140,28,true).translate(0,0,14).scale(scale).translate(0, 0, 0).color(color));

return p.model();
