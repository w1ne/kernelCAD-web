// Original kernelCAD low-poly very short pancake lens with a wide front rim and thin knurled barrel rings.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "pancake-lens",
  license: 'CC0-1.0',
  title: "Pancake lens",
  description: "Very short pancake lens with a wide front rim and thin knurled barrel rings. Knobs: overall scale and asset color.",
  tags: ["pancake lens", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4a5055", { label: 'Asset color' });
const p = assembly("pancake-lens");
p.part("barrel", (cylinder(54, 58, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount", (cylinder(14, 64, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-rim", (cylinder(12, 66, 12).translate(0, 0, 45)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-glass", (cylinder(5, 54, 12).translate(0, 0, 57)).translate(0, 0, 0).scale(scale).color(color));
p.part("focus-band", (cylinder(12, 61, 12).translate(0, 0, 21)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
