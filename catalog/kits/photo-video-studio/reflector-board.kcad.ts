// Original kernelCAD low-poly foldable rectangular reflector panel with a hinged center and a rear support kickstand.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "reflector-board",
  license: 'CC0-1.0',
  title: "Reflector board",
  description: "Foldable rectangular reflector panel with a hinged center and a rear support kickstand. Knobs: overall scale and asset color.",
  tags: ["reflector board", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#b7b5aa", { label: 'Asset color' });
const p = assembly("reflector-board");
p.part("left-panel", (box(430, 30, 610, true).translate(-215, 0, 315)).translate(0, 0, -10).scale(scale).color(color));
p.part("right-panel", (box(430, 30, 610, true).translate(215, 0, 315)).translate(0, 0, -10).scale(scale).color(color));
p.part("hinge", (cylinder(26, 18, 8).rotate([1, 0, 0], 90).translate(0, 0, 315)).translate(0, 0, -10).scale(scale).color(color));
p.part("kickstand", (box(30, 390, 18, true).rotate([1, 0, 0], 18).translate(0, 45, 164)).translate(0, 0, -10).scale(scale).color(color));
p.part("kickstand-foot", (box(250, 46, 24, true).translate(0, 45, 24)).translate(0, 0, -10).scale(scale).color(color));

return p.model();
