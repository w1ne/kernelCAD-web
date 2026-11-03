// Original kernelCAD low-poly compact rugged action camera with a wide lens, status screen and two-prong mounting foot.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "action-camera",
  license: 'CC0-1.0',
  title: "Action camera",
  description: "Compact rugged action camera with a wide lens, status screen and two-prong mounting foot. Knobs: overall scale and asset color.",
  tags: ["action camera", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#343a40", { label: 'Asset color' });
const p = assembly("action-camera");
p.part("body", (box(118, 68, 82, true).translate(0, 0, 96)).translate(0, 0, -1).scale(scale).color(color));
p.part("lens-barrel", (cylinder(48, 30, 12).rotate([1, 0, 0], 90).translate(0, -18, 104)).translate(0, 0, -1).scale(scale).color(color));
p.part("lens-face", (cylinder(8, 23, 12).rotate([1, 0, 0], 90).translate(0, -61, 104)).translate(0, 0, -1).scale(scale).color(color));
p.part("status-screen", (box(34, 5, 22, true).translate(-36, -36, 96)).translate(0, 0, -1).scale(scale).color(color));
p.part("mount-neck", (box(30, 24, 28, true).translate(0, 0, 40)).translate(0, 0, -1).scale(scale).color(color));
p.part("mount-tab-left", (box(18, 25, 26, true).translate(-12, 0, 14)).translate(0, 0, -1).scale(scale).color(color));
p.part("mount-tab-right", (box(18, 25, 26, true).translate(12, 0, 14)).translate(0, 0, -1).scale(scale).color(color));

return p.model();
