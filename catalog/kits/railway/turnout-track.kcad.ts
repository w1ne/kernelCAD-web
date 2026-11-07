// Original kernelCAD low-poly rail switch turnout with a straight route, diverging branch, crossing frog and six sleepers.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "turnout-track",
  license: 'CC0-1.0',
  title: "Railway turnout track",
  description: "Rail switch turnout with a straight route, diverging branch, crossing frog and six sleepers. Knobs: overall scale and asset color.",
  tags: ["turnout track", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#555b5f", { label: 'Asset color' });
const p = assembly("turnout-track");
p.part("ballast", box(1500,480,34,true).translate(0,0,18).scale(scale).translate(0, 0, -1).color(color));
p.part("main-left", box(1500,28,46,true).translate(0,-90,58).scale(scale).translate(0, 0, -1).color(color));
p.part("main-right", box(1500,28,46,true).translate(0,90,58).scale(scale).translate(0, 0, -1).color(color));
p.part("branch-rail", box(970,28,46,true).rotate([0,0,1],18).translate(210,210,58).scale(scale).translate(0, 0, -1).color(color));
p.part("frog", box(150,100,42,true).rotate([0,0,1],18).translate(380,145,55).scale(scale).translate(0, 0, -1).color(color));
p.part("tie-1", box(40,460,34,true).translate(-600,0,35).scale(scale).translate(0, 0, -1).color(color));
p.part("tie-2", box(40,460,34,true).translate(-360,0,35).scale(scale).translate(0, 0, -1).color(color));
p.part("tie-3", box(40,460,34,true).translate(-120,0,35).scale(scale).translate(0, 0, -1).color(color));
p.part("tie-4", box(40,460,34,true).translate(120,0,35).scale(scale).translate(0, 0, -1).color(color));
p.part("tie-5", box(40,460,34,true).translate(360,0,35).scale(scale).translate(0, 0, -1).color(color));
p.part("tie-6", box(40,460,34,true).translate(600,0,35).scale(scale).translate(0, 0, -1).color(color));

return p.model();
