// Original kernelCAD low-poly wide-angle prime lens with a short barrel and oversized front element ring.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "wide-angle-lens",
  license: 'CC0-1.0',
  title: "Wide-angle lens",
  description: "Wide-angle prime lens with a short barrel and oversized front element ring. Knobs: overall scale and asset color.",
  tags: ["wide angle lens", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#495057", { label: 'Asset color' });
const p = assembly("wide-angle-lens");
p.part("barrel", (cylinder(118, 57, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount", (cylinder(18, 62, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("focus-ring", (cylinder(38, 65, 12).translate(0, 0, 38)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-rim", (cylinder(18, 78, 12).translate(0, 0, 106)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-glass", (cylinder(7, 64, 12).translate(0, 0, 124)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
