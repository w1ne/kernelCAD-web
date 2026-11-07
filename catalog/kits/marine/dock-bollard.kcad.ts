// Original kernelCAD low-poly short cast-iron dock bollard with a flared foot and wide twin-horn cap.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "dock-bollard",
  license: 'CC0-1.0',
  title: "Dock bollard",
  description: "Short cast-iron dock bollard with a flared foot and wide twin-horn cap. Knobs: overall scale and asset color.",
  tags: ["dock bollard", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4d5357", { label: 'Asset color' });
const p = assembly("dock-bollard");
p.part("foot", (cylinder(34, 110, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("column", (cylinder(168, 56, 10).translate(0, 0, 30)).translate(0, 0, 0).scale(scale).color(color));
p.part("cap", (cylinder(50, 74, 10).translate(0, 0, 180)).translate(0, 0, 0).scale(scale).color(color));
p.part("horn-left", (cylinder(176, 30, 10).rotate([0, 1, 0], 90).translate(-53, 0, 220)).translate(0, 0, 0).scale(scale).color(color));
p.part("horn-right", (cylinder(176, 30, 10).rotate([0, 1, 0], 90).translate(53, 0, 220)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
