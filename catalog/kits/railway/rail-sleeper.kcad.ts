// Original kernelCAD low-poly concrete railway sleeper with two raised rail seats, fastening plates and four bolt heads.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "rail-sleeper",
  license: 'CC0-1.0',
  title: "Railway sleeper",
  description: "Concrete railway sleeper with two raised rail seats, fastening plates and four bolt heads. Knobs: overall scale and asset color.",
  tags: ["rail sleeper", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#777c7e", { label: 'Asset color' });
const p = assembly("rail-sleeper");
p.part("beam", box(300,250,48,true).translate(0,0,24).scale(scale).translate(0, 0, 0).color(color));
p.part("seat-left", box(90,96,24,true).translate(0,-84,60).scale(scale).translate(0, 0, 0).color(color));
p.part("seat-right", box(90,96,24,true).translate(0,84,60).scale(scale).translate(0, 0, 0).color(color));
p.part("plate-left", box(104,112,12,true).translate(0,-84,78).scale(scale).translate(0, 0, 0).color(color));
p.part("plate-right", box(104,112,12,true).translate(0,84,78).scale(scale).translate(0, 0, 0).color(color));
p.part("bolt-1", cylinder(16,12,8).translate(-36,-116,84).scale(scale).translate(0, 0, 0).color(color));
p.part("bolt-2", cylinder(16,12,8).translate(36,-116,84).scale(scale).translate(0, 0, 0).color(color));
p.part("bolt-3", cylinder(16,12,8).translate(-36,116,84).scale(scale).translate(0, 0, 0).color(color));
p.part("bolt-4", cylinder(16,12,8).translate(36,116,84).scale(scale).translate(0, 0, 0).color(color));

return p.model();
