// Original kernelCAD low-poly manual follow-focus control with a large side wheel, geared lens ring and adjustable support arm.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "follow-focus-unit",
  license: 'CC0-1.0',
  title: "Follow focus unit",
  description: "Manual follow-focus control with a large side wheel, geared lens ring and adjustable support arm. Knobs: overall scale and asset color.",
  tags: ["follow focus unit", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#51575b", { label: 'Asset color' });
const p = assembly("follow-focus-unit");
p.part("lens-barrel", (cylinder(210, 58, 12).translate(0, 0, 0)).translate(0, 0, 11).scale(scale).color(color));
p.part("gear-ring", (cylinder(24, 76, 12).translate(0, 0, 116)).translate(0, 0, 11).scale(scale).color(color));
p.part("front-rim", (cylinder(16, 68, 12).translate(0, 0, 210)).translate(0, 0, 11).scale(scale).color(color));
p.part("support-arm", (box(48, 120, 28, true).translate(72, 82, 45)).translate(0, 0, 11).scale(scale).color(color));
p.part("wheel-hub", (cylinder(34, 35, 12).rotate([1, 0, 0], 90).translate(110, 86, 100)).translate(0, 0, 11).scale(scale).color(color));
p.part("focus-wheel", (cylinder(25, 76, 16).rotate([1, 0, 0], 90).translate(110, 122, 100)).translate(0, 0, 11).scale(scale).color(color));
p.part("wheel-handle", (box(46, 40, 20, true).translate(110, 158, 100)).translate(0, 0, 11).scale(scale).color(color));
p.part("clamp", (box(70, 56, 46, true).translate(0, 82, 12)).translate(0, 0, 11).scale(scale).color(color));

return p.model();
