// Original kernelCAD low-poly traditional life ring with a thick circular body, four grip straps and a rope loop.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "life-ring",
  license: 'CC0-1.0',
  title: "Life ring",
  description: "Traditional life ring with a thick circular body, four grip straps and a rope loop. Knobs: overall scale and asset color.",
  tags: ["life ring", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#d5503e", { label: 'Asset color' });
const p = assembly("life-ring");
p.part("ring-body", (cylinder(34, 178, 20).subtract(cylinder(36, 112, 20).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 178)).translate(0, 0, 27).scale(scale).color(color));
p.part("strap-1", (box(24, 44, 115, true).rotate([0, 1, 0], 45).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(color));
p.part("strap-2", (box(24, 44, 115, true).rotate([0, 1, 0], -45).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(color));
p.part("strap-3", (box(24, 44, 115, true).rotate([0, 1, 0], 135).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(color));
p.part("strap-4", (box(24, 44, 115, true).rotate([0, 1, 0], -135).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(color));
p.part("rope-loop", (cylinder(18, 205, 16).subtract(cylinder(20, 187, 16).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 178)).translate(0, 0, 27).scale(scale).color(color));

return p.model();
