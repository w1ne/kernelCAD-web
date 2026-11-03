// Original kernelCAD low-poly shallow beauty-dish reflector with a raised center deflector, rim and support yoke.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "beauty-dish-light",
  license: 'CC0-1.0',
  title: "Beauty dish light",
  description: "Shallow beauty-dish reflector with a raised center deflector, rim and support yoke. Knobs: overall scale and asset color.",
  tags: ["beauty dish light", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#747b80", { label: 'Asset color' });
const p = assembly("beauty-dish-light");
p.part("dish", (sphere(170).scale([1, 0.22, 1]).translate(0, -28, 760)).translate(0, 0, 0).scale(scale).color(color));
p.part("outer-rim", (cylinder(16, 173, 16).rotate([1, 0, 0], 90).translate(0, -22, 760)).translate(0, 0, 0).scale(scale).color(color));
p.part("center-deflector", (sphere(44).scale([1, 0.3, 1]).translate(0, -67, 760)).translate(0, 0, 0).scale(scale).color(color));
p.part("stem", (cylinder(80, 17, 10).rotate([1, 0, 0], 90).translate(0, 12, 760)).translate(0, 0, 0).scale(scale).color(color));
p.part("yoke-left", (box(20, 28, 260, true).translate(-155, 20, 640)).translate(0, 0, 0).scale(scale).color(color));
p.part("yoke-right", (box(20, 28, 260, true).translate(155, 20, 640)).translate(0, 0, 0).scale(scale).color(color));
p.part("stand-pole", (cylinder(690, 18, 8).translate(0, 0, 20)).translate(0, 0, 0).scale(scale).color(color));
p.part("stand-foot", (box(34, 340, 24, true).translate(0, 0, 12)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
