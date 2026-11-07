// Original kernelCAD low-poly compact enclosed rescue lifeboat with pointed hull, cabin, observation windows and roof beacon.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "rescue-lifeboat",
  license: 'CC0-1.0',
  title: "Rescue lifeboat",
  description: "Compact enclosed rescue lifeboat with pointed hull, cabin, observation windows and roof beacon. Knobs: overall scale and asset color.",
  tags: ["rescue lifeboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#e45c3a", { label: 'Asset color' });
const p = assembly("rescue-lifeboat");
p.part("hull", (extrudePolygon([[-720, 0], [-500, 250], [370, 250], [620, 120], [680, 0], [620, -120], [370, -250], [-500, -250]], 160).translate(0, 0, 35)).translate(0, 0, -35).scale(scale).color(color));
p.part("deck", (box(1020, 420, 42, true).translate(-20, 0, 215)).translate(0, 0, -35).scale(scale).color(color));
p.part("cabin", (box(470, 300, 260, true).translate(-130, 0, 360)).translate(0, 0, -35).scale(scale).color(color));
p.part("front-window", (box(270, 12, 96, true).translate(45, -154, 418)).translate(0, 0, -35).scale(scale).color(color));
p.part("side-window", (box(12, 168, 82, true).translate(-371, -5, 420)).translate(0, 0, -35).scale(scale).color(color));
p.part("roof", (box(540, 344, 48, true).translate(-130, 0, 514)).translate(0, 0, -35).scale(scale).color(color));
p.part("beacon", (cylinder(72, 33, 10).translate(-130, 0, 572)).translate(0, 0, -35).scale(scale).color(color));

return p.model();
