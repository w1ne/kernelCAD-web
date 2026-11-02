// Original kernelCAD low-poly manual track switch lever with a weighted base, upright handle, counterweight and connecting rod.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "track-switch-lever",
  license: 'CC0-1.0',
  title: "Track switch lever",
  description: "Manual track switch lever with a weighted base, upright handle, counterweight and connecting rod. Knobs: overall scale and asset color.",
  tags: ["track switch lever", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#67624f", { label: 'Asset color' });
const p = assembly("track-switch-lever");
p.part("base", box(260,180,46,true).translate(0,0,23).scale(scale).translate(0, 0, 0).color(color));
p.part("pivot-post", cylinder(240,32,10).translate(0,0,46).scale(scale).translate(0, 0, 0).color(color));
p.part("lever", box(40,40,600,true).rotate([0,1,0],-18).translate(0,0,360).scale(scale).translate(0, 0, 0).color(color));
p.part("grip", cylinder(160,32,10).rotate([0,1,0],90).translate(-80,0,640).scale(scale).translate(0, 0, 0).color(color));
p.part("counterweight", box(150,100,50,true).translate(120,0,170).scale(scale).translate(0, 0, 0).color(color));
p.part("rod", box(330,28,24,true).rotate([0,1,0],8).translate(180,0,100).scale(scale).translate(0, 0, 0).color(color));

return p.model();
