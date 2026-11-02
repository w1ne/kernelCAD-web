// Original kernelCAD low-poly short anchor chain with linked oval chain plates and a large terminal shackle.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "anchor-chain",
  license: 'CC0-1.0',
  title: "Anchor chain",
  description: "Short anchor chain with linked oval chain plates and a large terminal shackle. Knobs: overall scale and asset color.",
  tags: ["anchor chain", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#53595d", { label: 'Asset color' });
const p = assembly("anchor-chain");
p.part("link-1", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 44)).translate(0, 0, -2).scale(scale).color(color));
p.part("link-2", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).rotate([0, 0, 1], 90).translate(0, 0, 112)).translate(0, 0, -2).scale(scale).color(color));
p.part("link-3", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 180)).translate(0, 0, -2).scale(scale).color(color));
p.part("link-4", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).rotate([0, 0, 1], 90).translate(0, 0, 248)).translate(0, 0, -2).scale(scale).color(color));
p.part("link-5", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 316)).translate(0, 0, -2).scale(scale).color(color));
p.part("terminal-shackle", (cylinder(26, 36, 10).rotate([1, 0, 0], 90).translate(0, 0, 384)).translate(0, 0, -2).scale(scale).color(color));

return p.model();
