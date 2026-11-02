// Original kernelCAD low-poly rail crossing barrier with a striped arm, pivot housing, counterweight and short signal mast.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "crossing-gate",
  license: 'CC0-1.0',
  title: "Rail crossing gate",
  description: "Rail crossing barrier with a striped arm, pivot housing, counterweight and short signal mast. Knobs: overall scale and asset color.",
  tags: ["crossing gate", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#ce4f3c", { label: 'Asset color' });
const p = assembly("crossing-gate");
p.part("base", box(180,150,38,true).translate(0,0,19).scale(scale).translate(0, 0, 0).color(color));
p.part("pivot-post", box(62,62,360,true).translate(0,0,218).scale(scale).translate(0, 0, 0).color(color));
p.part("housing", box(130,130,120,true).translate(0,0,448).scale(scale).translate(0, 0, 0).color(color));
p.part("barrier-arm", box(1100,48,48,true).rotate([0,1,0],-3).translate(580,0,520).scale(scale).translate(0, 0, 0).color(color));
p.part("counterweight", box(140,70,80,true).translate(-110,0,520).scale(scale).translate(0, 0, 0).color(color));
p.part("lamp-post", cylinder(260,18,8).translate(80,0,500).scale(scale).translate(0, 0, 0).color(color));
p.part("lamp-head", box(84,62,104,true).translate(80,0,680).scale(scale).translate(0, 0, 0).color(color));

return p.model();
