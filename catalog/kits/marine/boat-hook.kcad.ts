// Original kernelCAD low-poly long boat hook with a tapered pole, curved pickup tip and short crossbar.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "boat-hook",
  license: 'CC0-1.0',
  title: "Boat hook",
  description: "Long boat hook with a tapered pole, curved pickup tip and short crossbar. Knobs: overall scale and asset color.",
  tags: ["boat hook", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6b6250", { label: 'Asset color' });
const p = assembly("boat-hook");
p.part("shaft", (cylinder(1450, 18, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("collar", (cylinder(34, 27, 8).translate(0, 0, 1260)).translate(0, 0, 0).scale(scale).color(color));
p.part("hook-spine", (box(28, 30, 190, true).rotate([0, 1, 0], -20).translate(0, 0, 1490)).translate(0, 0, 0).scale(scale).color(color));
p.part("hook-tip", (sphere(25).translate(-34, 0, 1570)).translate(0, 0, 0).scale(scale).color(color));
p.part("crossbar", (box(176, 30, 34, true).translate(0, 0, 1370)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
