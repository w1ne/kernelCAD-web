// Original kernelCAD low-poly deck anchor winch with horizontal chain drum, paired support cheeks, crank and base plate.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "anchor-winch",
  license: 'CC0-1.0',
  title: "Anchor winch",
  description: "Deck anchor winch with horizontal chain drum, paired support cheeks, crank and base plate. Knobs: overall scale and asset color.",
  tags: ["anchor winch", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4e5458", { label: 'Asset color' });
const p = assembly("anchor-winch");
p.part("base", (box(420, 280, 44, true).translate(0, 0, 22)).translate(0, 0, 0).scale(scale).color(color));
p.part("cheek-left", (box(36, 230, 250, true).translate(-142, 0, 168)).translate(0, 0, 0).scale(scale).color(color));
p.part("cheek-right", (box(36, 230, 250, true).translate(142, 0, 168)).translate(0, 0, 0).scale(scale).color(color));
p.part("drum", (cylinder(260, 86, 12).rotate([1, 0, 0], 90).translate(-130, 0, 220)).translate(0, 0, 0).scale(scale).color(color));
p.part("drum-flange-left", (cylinder(22, 118, 12).rotate([1, 0, 0], 90).translate(-130, -127, 220)).translate(0, 0, 0).scale(scale).color(color));
p.part("drum-flange-right", (cylinder(22, 118, 12).rotate([1, 0, 0], 90).translate(-130, 105, 220)).translate(0, 0, 0).scale(scale).color(color));
p.part("crank-arm", (box(28, 38, 205, true).translate(177, 0, 184)).translate(0, 0, 0).scale(scale).color(color));
p.part("crank-handle", (cylinder(115, 23, 10).rotate([0, 1, 0], 90).translate(177, 0, 82)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
