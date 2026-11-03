// Original kernelCAD low-poly short straight rail section with twin rails, six sleepers, tie plates and gravel ballast base.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "straight-track",
  license: 'CC0-1.0',
  title: "Straight railway track",
  description: "Short straight rail section with twin rails, six sleepers, tie plates and gravel ballast base. Knobs: overall scale and asset color.",
  tags: ["straight track", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#555b5f", { label: 'Asset color' });
const p = assembly("straight-track");
p.part("ballast", box(1500,330,36,true).translate(0,0,18).scale(scale).translate(0, 0, 0).color(color));
p.part("rail-left", box(1500,34,54,true).translate(0,-84,63).scale(scale).translate(0, 0, 0).color(color));
p.part("rail-right", box(1500,34,54,true).translate(0,84,63).scale(scale).translate(0, 0, 0).color(color));
p.part("sleeper-1", box(38,300,36,true).translate(-650,0,36).scale(scale).translate(0, 0, 0).color(color));
p.part("sleeper-2", box(38,300,36,true).translate(-390,0,36).scale(scale).translate(0, 0, 0).color(color));
p.part("sleeper-3", box(38,300,36,true).translate(-130,0,36).scale(scale).translate(0, 0, 0).color(color));
p.part("sleeper-4", box(38,300,36,true).translate(130,0,36).scale(scale).translate(0, 0, 0).color(color));
p.part("sleeper-5", box(38,300,36,true).translate(390,0,36).scale(scale).translate(0, 0, 0).color(color));
p.part("sleeper-6", box(38,300,36,true).translate(650,0,36).scale(scale).translate(0, 0, 0).color(color));

return p.model();
