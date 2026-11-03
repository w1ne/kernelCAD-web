// Original kernelCAD low-poly marine life jacket with two shoulder floats, broad chest panels, waist straps and a collar.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "life-jacket",
  license: 'CC0-1.0',
  title: "Life jacket",
  description: "Marine life jacket with two shoulder floats, broad chest panels, waist straps and a collar. Knobs: overall scale and asset color.",
  tags: ["life jacket", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#e15a38", { label: 'Asset color' });
const p = assembly("life-jacket");
p.part("torso", (box(300, 150, 360, true).translate(0, 0, 275)).translate(0, 0, -94).scale(scale).color(color));
p.part("left-flotation", (box(120, 180, 370, true).rotate([0, 1, 0], 9).translate(-125, 0, 300)).translate(0, 0, -94).scale(scale).color(color));
p.part("right-flotation", (box(120, 180, 370, true).rotate([0, 1, 0], -9).translate(125, 0, 300)).translate(0, 0, -94).scale(scale).color(color));
p.part("collar-left", (sphere(90).scale([0.9, 1, 0.55]).translate(-94, 0, 485)).translate(0, 0, -94).scale(scale).color(color));
p.part("collar-right", (sphere(90).scale([0.9, 1, 0.55]).translate(94, 0, 485)).translate(0, 0, -94).scale(scale).color(color));
p.part("waist-strap", (box(330, 24, 44, true).translate(0, 0, 118)).translate(0, 0, -94).scale(scale).color(color));
p.part("buckle", (box(55, 32, 48, true).translate(0, -4, 118)).translate(0, 0, -94).scale(scale).color(color));

return p.model();
