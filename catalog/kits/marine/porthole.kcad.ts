// Original kernelCAD low-poly round ship porthole with a raised circular frame, inner opening and four fastening lugs.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "porthole",
  license: 'CC0-1.0',
  title: "Ship porthole",
  description: "Round ship porthole with a raised circular frame, inner opening and four fastening lugs. Knobs: overall scale and asset color.",
  tags: ["porthole", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#8a744a", { label: 'Asset color' });
const p = assembly("porthole");
p.part("frame", (cylinder(36, 180, 16).subtract(cylinder(38, 132, 16).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 190)).translate(0, 0, 8).scale(scale).color(color));
p.part("inner-glass", (cylinder(12, 129, 16).rotate([1, 0, 0], 90).translate(0, -26, 190)).translate(0, 0, 8).scale(scale).color(color));
p.part("lug-top", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(0, -15, 362)).translate(0, 0, 8).scale(scale).color(color));
p.part("lug-bottom", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(0, -15, 18)).translate(0, 0, 8).scale(scale).color(color));
p.part("lug-left", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(-172, -15, 190)).translate(0, 0, 8).scale(scale).color(color));
p.part("lug-right", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(172, -15, 190)).translate(0, 0, 8).scale(scale).color(color));

return p.model();
