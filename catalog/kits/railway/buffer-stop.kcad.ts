// Original kernelCAD low-poly track-end buffer stop with twin impact pads, a heavy crossbeam, support posts and short rails.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "buffer-stop",
  license: 'CC0-1.0',
  title: "Railway buffer stop",
  description: "Track-end buffer stop with twin impact pads, a heavy crossbeam, support posts and short rails. Knobs: overall scale and asset color.",
  tags: ["buffer stop", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#555b5f", { label: 'Asset color' });
const p = assembly("buffer-stop");
p.part("rail-left", box(650,34,48,true).translate(0,-82,55).scale(scale).translate(0, 0, -18).color(color));
p.part("rail-right", box(650,34,48,true).translate(0,82,55).scale(scale).translate(0, 0, -18).color(color));
p.part("sleeper-1", box(36,300,34,true).translate(-250,0,35).scale(scale).translate(0, 0, -18).color(color));
p.part("sleeper-2", box(36,300,34,true).translate(0,0,35).scale(scale).translate(0, 0, -18).color(color));
p.part("sleeper-3", box(36,300,34,true).translate(250,0,35).scale(scale).translate(0, 0, -18).color(color));
p.part("post-left", box(44,50,250,true).translate(275,-82,190).scale(scale).translate(0, 0, -18).color(color));
p.part("post-right", box(44,50,250,true).translate(275,82,190).scale(scale).translate(0, 0, -18).color(color));
p.part("crossbeam", box(56,300,70,true).translate(300,0,280).scale(scale).translate(0, 0, -18).color(color));
p.part("pad-left", cylinder(52,56,12).rotate([1,0,0],90).translate(330,-82,280).scale(scale).translate(0, 0, -18).color(color));
p.part("pad-right", cylinder(52,56,12).rotate([1,0,0],90).translate(330,82,280).scale(scale).translate(0, 0, -18).color(color));

return p.model();
