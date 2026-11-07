// Original kernelCAD low-poly round station clock on a tall post with a broad face, bezel rim and four support feet.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "station-clock",
  license: 'CC0-1.0',
  title: "Station clock",
  description: "Round station clock on a tall post with a broad face, bezel rim and four support feet. Knobs: overall scale and asset color.",
  tags: ["station clock", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6b6255", { label: 'Asset color' });
const p = assembly("station-clock");
p.part("post", box(48,48,620,true).translate(0,0,310).scale(scale).translate(0, 0, 0).color(color));
p.part("face", cylinder(34,180,16).rotate([1,0,0],90).translate(0,-22,700).scale(scale).translate(0, 0, 0).color(color));
p.part("rim", cylinder(32,198,16).subtract(cylinder(34,166,16).translate(0,0,-1)).rotate([1,0,0],90).translate(0,-14,700).scale(scale).translate(0, 0, 0).color(color));
p.part("top-cap", box(240,180,38,true).translate(0,0,820).scale(scale).translate(0, 0, 0).color(color));
p.part("base", box(220,180,50,true).translate(0,0,25).scale(scale).translate(0, 0, 0).color(color));

return p.model();
