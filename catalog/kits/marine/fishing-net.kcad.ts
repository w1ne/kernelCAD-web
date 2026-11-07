// Original kernelCAD low-poly folded marine fishing net with a top float line, weighted lower edge and repeated net strands.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "fishing-net",
  license: 'CC0-1.0',
  title: "Fishing net",
  description: "Folded marine fishing net with a top float line, weighted lower edge and repeated net strands. Knobs: overall scale and asset color.",
  tags: ["fishing net", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#72654d", { label: 'Asset color' });
const p = assembly("fishing-net");
p.part("top-rope", (cylinder(980, 18, 8).rotate([0, 1, 0], 90).translate(-490, 0, 620)).translate(0, 0, -21).scale(scale).color(color));
p.part("bottom-rope", (cylinder(980, 24, 8).rotate([0, 1, 0], 90).translate(-490, 0, 45)).translate(0, 0, -21).scale(scale).color(color));
p.part("side-left", (cylinder(580, 16, 8).translate(-490, 0, 45)).translate(0, 0, -21).scale(scale).color(color));
p.part("side-right", (cylinder(580, 16, 8).translate(490, 0, 45)).translate(0, 0, -21).scale(scale).color(color));
p.part("net-1", (box(10, 12, 600, true).rotate([0, 1, 0], 42).translate(-320, 0, 330)).translate(0, 0, -21).scale(scale).color(color));
p.part("net-2", (box(10, 12, 600, true).rotate([0, 1, 0], -42).translate(-160, 0, 330)).translate(0, 0, -21).scale(scale).color(color));
p.part("net-3", (box(10, 12, 600, true).rotate([0, 1, 0], 42).translate(0, 0, 330)).translate(0, 0, -21).scale(scale).color(color));
p.part("net-4", (box(10, 12, 600, true).rotate([0, 1, 0], -42).translate(160, 0, 330)).translate(0, 0, -21).scale(scale).color(color));
p.part("net-5", (box(10, 12, 600, true).rotate([0, 1, 0], 42).translate(320, 0, 330)).translate(0, 0, -21).scale(scale).color(color));

return p.model();
