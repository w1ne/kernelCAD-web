// Original kernelCAD low-poly low round crab trap with circular base, hoop frame, mesh ribs and central bait cage.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "crab-trap",
  license: 'CC0-1.0',
  title: "Crab trap",
  description: "Low round crab trap with circular base, hoop frame, mesh ribs and central bait cage. Knobs: overall scale and asset color.",
  tags: ["crab trap", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7a6547", { label: 'Asset color' });
const p = assembly("crab-trap");
p.part("base-ring", (cylinder(28, 245, 16).subtract(cylinder(30, 202, 16).translate(0, 0, -1)).translate(0, 0, 16)).translate(0, 0, -16).scale(scale).color(color));
p.part("top-ring", (cylinder(26, 245, 16).subtract(cylinder(28, 202, 16).translate(0, 0, -1)).translate(0, 0, 300)).translate(0, 0, -16).scale(scale).color(color));
p.part("rib-1", (box(24, 24, 300, true).translate(-220, 0, 178)).translate(0, 0, -16).scale(scale).color(color));
p.part("rib-2", (box(24, 24, 300, true).translate(220, 0, 178)).translate(0, 0, -16).scale(scale).color(color));
p.part("rib-3", (box(24, 24, 300, true).translate(0, -220, 178)).translate(0, 0, -16).scale(scale).color(color));
p.part("rib-4", (box(24, 24, 300, true).translate(0, 220, 178)).translate(0, 0, -16).scale(scale).color(color));
p.part("bait-cage", (box(130, 130, 155, true).translate(0, 0, 178)).translate(0, 0, -16).scale(scale).color(color));
p.part("handle", (box(34, 34, 130, true).translate(0, 0, 366)).translate(0, 0, -16).scale(scale).color(color));

return p.model();
