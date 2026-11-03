// Original kernelCAD low-poly square softbox with a broad front diffuser, tapered fabric body, rear mount and light stand.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "softbox-light",
  license: 'CC0-1.0',
  title: "Softbox light",
  description: "Square softbox with a broad front diffuser, tapered fabric body, rear mount and light stand. Knobs: overall scale and asset color.",
  tags: ["softbox light", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4b5359", { label: 'Asset color' });
const p = assembly("softbox-light");
p.part("front-diffuser", (box(360, 22, 360, true).translate(0, -15, 860)).translate(0, 0, -7.5).scale(scale).color(color));
p.part("side-left", (box(72, 130, 330, true).rotate([0, 1, 0], -25).translate(-184, 36, 860)).translate(0, 0, -7.5).scale(scale).color(color));
p.part("side-right", (box(72, 130, 330, true).rotate([0, 1, 0], 25).translate(184, 36, 860)).translate(0, 0, -7.5).scale(scale).color(color));
p.part("top-side", (box(330, 130, 72, true).rotate([1, 0, 0], -25).translate(0, 36, 1044)).translate(0, 0, -7.5).scale(scale).color(color));
p.part("bottom-side", (box(330, 130, 72, true).rotate([1, 0, 0], 25).translate(0, 36, 676)).translate(0, 0, -7.5).scale(scale).color(color));
p.part("rear-mount", (cylinder(44, 40, 10).rotate([1, 0, 0], 90).translate(0, 98, 860)).translate(0, 0, -7.5).scale(scale).color(color));
p.part("stand-pole", (cylinder(680, 18, 8).translate(0, 98, 90)).translate(0, 0, -7.5).scale(scale).color(color));
p.part("stand-base", (box(36, 370, 25, true).translate(0, 98, 20)).translate(0, 0, -7.5).scale(scale).color(color));

return p.model();
