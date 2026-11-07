// Original kernelCAD low-poly three-axis handheld gimbal with a camera cradle, side arms, control grip and small thumb wheel.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "gimbal-stabilizer",
  license: 'CC0-1.0',
  title: "Camera gimbal stabilizer",
  description: "Three-axis handheld gimbal with a camera cradle, side arms, control grip and small thumb wheel. Knobs: overall scale and asset color.",
  tags: ["gimbal stabilizer", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#353b40", { label: 'Asset color' });
const p = assembly("gimbal-stabilizer");
p.part("grip", (box(54, 58, 255, true).translate(0, 0, 145)).translate(0, 0, -17.5).scale(scale).color(color));
p.part("control-panel", (box(68, 28, 74, true).translate(0, -26, 270)).translate(0, 0, -17.5).scale(scale).color(color));
p.part("upright-arm", (box(24, 34, 300, true).translate(122, 0, 492)).translate(0, 0, -17.5).scale(scale).color(color));
p.part("cross-arm", (box(240, 34, 24, true).translate(0, 0, 642)).translate(0, 0, -17.5).scale(scale).color(color));
p.part("camera-plate", (box(210, 94, 22, true).translate(-68, 0, 655)).translate(0, 0, -17.5).scale(scale).color(color));
p.part("camera-body", (box(140, 86, 96, true).translate(-68, 0, 718)).translate(0, 0, -17.5).scale(scale).color(color));
p.part("lens", (cylinder(68, 33, 10).rotate([1, 0, 0], 90).translate(-68, -41, 720)).translate(0, 0, -17.5).scale(scale).color(color));
p.part("side-wheel", (cylinder(18, 34, 10).rotate([1, 0, 0], 90).translate(62, -23, 280)).translate(0, 0, -17.5).scale(scale).color(color));

return p.model();
