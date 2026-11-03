// Original kernelCAD low-poly compact camera slider with twin guide rails, carriage plate, end stops and leveling feet.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "camera-slider",
  license: 'CC0-1.0',
  title: "Camera slider",
  description: "Compact camera slider with twin guide rails, carriage plate, end stops and leveling feet. Knobs: overall scale and asset color.",
  tags: ["camera slider", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#50575c", { label: 'Asset color' });
const p = assembly("camera-slider");
p.part("rail-left", (box(920, 28, 32, true).translate(0, -76, 124)).translate(0, 0, 0).scale(scale).color(color));
p.part("rail-right", (box(920, 28, 32, true).translate(0, 76, 124)).translate(0, 0, 0).scale(scale).color(color));
p.part("carriage", (box(240, 192, 36, true).translate(0, 0, 160)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount", (cylinder(45, 34, 10).translate(0, 0, 178)).translate(0, 0, 0).scale(scale).color(color));
p.part("end-left", (box(48, 190, 65, true).translate(-470, 0, 124)).translate(0, 0, 0).scale(scale).color(color));
p.part("end-right", (box(48, 190, 65, true).translate(470, 0, 124)).translate(0, 0, 0).scale(scale).color(color));
p.part("foot-front-left", (cylinder(28, 25, 8).translate(-380, -76, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("foot-front-right", (cylinder(28, 25, 8).translate(380, -76, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("foot-rear-left", (cylinder(28, 25, 8).translate(-380, 76, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("foot-rear-right", (cylinder(28, 25, 8).translate(380, 76, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
