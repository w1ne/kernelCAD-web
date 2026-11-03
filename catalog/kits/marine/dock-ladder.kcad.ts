// Original kernelCAD low-poly marine dock ladder with two long rails, five broad rungs and rounded lower ends.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "dock-ladder",
  license: 'CC0-1.0',
  title: "Dock ladder",
  description: "Marine dock ladder with two long rails, five broad rungs and rounded lower ends. Knobs: overall scale and asset color.",
  tags: ["dock ladder", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#777c7e", { label: 'Asset color' });
const p = assembly("dock-ladder");
p.part("rail-left", (cylinder(1100, 30, 10).translate(-170, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("rail-right", (cylinder(1100, 30, 10).translate(170, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("rung-1", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 170)).translate(0, 0, 0).scale(scale).color(color));
p.part("rung-2", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 360)).translate(0, 0, 0).scale(scale).color(color));
p.part("rung-3", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 550)).translate(0, 0, 0).scale(scale).color(color));
p.part("rung-4", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 740)).translate(0, 0, 0).scale(scale).color(color));
p.part("rung-5", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 930)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
