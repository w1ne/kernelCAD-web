// Original kernelCAD low-poly low-poly steam locomotive with a boiler, smokestack, cab, cowcatcher and three driving wheel pairs.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "steam-locomotive",
  license: 'CC0-1.0',
  title: "Steam locomotive",
  description: "Low-poly steam locomotive with a boiler, smokestack, cab, cowcatcher and three driving wheel pairs. Knobs: overall scale and asset color.",
  tags: ["steam locomotive", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#34393d", { label: 'Asset color' });
const p = assembly("steam-locomotive");
p.part("lower-frame", box(760, 290, 110, true).translate(-30, 0, 180).scale(scale).translate(0, 0, -8.427).color(color));
p.part("boiler", cylinder(620, 132, 12).rotate([0, 1, 0], 90).translate(-340, 0, 360).scale(scale).translate(0, 0, -8.427).color(color));
p.part("boiler-front", cylinder(18, 139, 12).rotate([0, 1, 0], 90).translate(276, 0, 360).scale(scale).translate(0, 0, -8.427).color(color));
p.part("smokestack", cylinder(150, 48, 10).translate(165, 0, 496).scale(scale).translate(0, 0, -8.427).color(color));
p.part("stack-cap", cylinder(24, 65, 10).translate(165, 0, 642).scale(scale).translate(0, 0, -8.427).color(color));
p.part("cab", box(280, 300, 380, true).translate(-410, 0, 375).scale(scale).translate(0, 0, -8.427).color(color));
p.part("cab-roof", box(340, 360, 48, true).translate(-410, 0, 589).scale(scale).translate(0, 0, -8.427).color(color));
p.part("front-window", box(156, 10, 128, true).translate(-259, -153, 440).scale(scale).translate(0, 0, -8.427).color(color));
p.part("cowcatcher", box(220, 300, 58, true).rotate([0, 1, 0], -18).translate(420, 0, 70).scale(scale).translate(0, 0, -8.427).color(color));
p.part("wheel-a-left", cylinder(36, 104, 12).rotate([1, 0, 0], 90).translate(-260, -102, 115).scale(scale).translate(0, 0, -8.427).color(color));
p.part("wheel-a-right", cylinder(36, 104, 12).rotate([1, 0, 0], 90).translate(-260, 138, 115).scale(scale).translate(0, 0, -8.427).color(color));
p.part("wheel-b-left", cylinder(36, 104, 12).rotate([1, 0, 0], 90).translate(0, -102, 115).scale(scale).translate(0, 0, -8.427).color(color));
p.part("wheel-b-right", cylinder(36, 104, 12).rotate([1, 0, 0], 90).translate(0, 138, 115).scale(scale).translate(0, 0, -8.427).color(color));
p.part("wheel-c-left", cylinder(36, 104, 12).rotate([1, 0, 0], 90).translate(260, -102, 115).scale(scale).translate(0, 0, -8.427).color(color));
p.part("wheel-c-right", cylinder(36, 104, 12).rotate([1, 0, 0], 90).translate(260, 138, 115).scale(scale).translate(0, 0, -8.427).color(color));
p.part("drive-rod", box(530, 26, 24, true).translate(0, -142, 115).scale(scale).translate(0, 0, -8.427).color(color));

return p.model();
