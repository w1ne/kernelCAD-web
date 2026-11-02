// Original kernelCAD low-poly compact mirrorless camera with a flat-top body, electronic viewfinder, hand grip and interchangeable lens.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "mirrorless-camera",
  license: 'CC0-1.0',
  title: "Mirrorless camera",
  description: "Compact mirrorless camera with a flat-top body, electronic viewfinder, hand grip and interchangeable lens. Knobs: overall scale and asset color.",
  tags: ["mirrorless camera", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#37424a", { label: 'Asset color' });
const p = assembly("mirrorless-camera");
p.part("body", (box(214, 92, 132, true).translate(0, 0, 132)).translate(0, 0, -66).scale(scale).color(color));
p.part("grip", (box(54, 86, 116, true).translate(107, -1, 128)).translate(0, 0, -66).scale(scale).color(color));
p.part("viewfinder", (box(66, 58, 48, true).translate(-30, 0, 222)).translate(0, 0, -66).scale(scale).color(color));
p.part("lens", (cylinder(112, 49, 12).rotate([1, 0, 0], 90).translate(-10, -38, 136)).translate(0, 0, -66).scale(scale).color(color));
p.part("front-ring", (cylinder(12, 56, 12).rotate([1, 0, 0], 90).translate(-10, -144, 136)).translate(0, 0, -66).scale(scale).color(color));
p.part("mode-dial", (cylinder(12, 16, 8).translate(-65, 18, 204)).translate(0, 0, -66).scale(scale).color(color));
p.part("hot-shoe", (box(46, 20, 8, true).translate(27, 0, 202)).translate(0, 0, -66).scale(scale).color(color));

return p.model();
