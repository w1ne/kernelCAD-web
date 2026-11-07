// Original kernelCAD low-poly single-leg camera monopod with a rubber foot, wrist strap, twist locks and compact tilt head.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "monopod",
  license: 'CC0-1.0',
  title: "Camera monopod",
  description: "Single-leg camera monopod with a rubber foot, wrist strap, twist locks and compact tilt head. Knobs: overall scale and asset color.",
  tags: ["monopod", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4c5257", { label: 'Asset color' });
const p = assembly("monopod");
p.part("lower-shaft", (cylinder(660, 24, 8).translate(0, 0, 50)).translate(0, 0, 0).scale(scale).color(color));
p.part("upper-shaft", (cylinder(420, 16, 8).translate(0, 0, 690)).translate(0, 0, 0).scale(scale).color(color));
p.part("lock-one", (cylinder(26, 33, 8).translate(0, 0, 680)).translate(0, 0, 0).scale(scale).color(color));
p.part("lock-two", (cylinder(24, 28, 8).translate(0, 0, 1084)).translate(0, 0, 0).scale(scale).color(color));
p.part("tilt-head", (box(82, 72, 82, true).translate(0, 0, 1150)).translate(0, 0, 0).scale(scale).color(color));
p.part("quick-plate", (box(110, 70, 20, true).translate(0, 0, 1200)).translate(0, 0, 0).scale(scale).color(color));
p.part("wrist-loop", (box(12, 92, 70, true).translate(42, 16, 1030)).translate(0, 0, 0).scale(scale).color(color));
p.part("rubber-foot", (cylinder(42, 34, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
