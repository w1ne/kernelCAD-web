// Original kernelCAD low-poly vintage rangefinder body with paired front windows, a compact lens and top-mounted rewind controls.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "film-rangefinder-camera",
  license: 'CC0-1.0',
  title: "Film rangefinder camera",
  description: "Vintage rangefinder body with paired front windows, a compact lens and top-mounted rewind controls. Knobs: overall scale and asset color.",
  tags: ["film rangefinder camera", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6b5943", { label: 'Asset color' });
const p = assembly("film-rangefinder-camera");
p.part("body", (box(210, 82, 132, true).translate(0, 0, 130)).translate(0, 0, -64).scale(scale).color(color));
p.part("top-plate", (box(222, 86, 24, true).translate(0, 0, 208)).translate(0, 0, -64).scale(scale).color(color));
p.part("lens", (cylinder(74, 39, 12).rotate([1, 0, 0], 90).translate(0, -36, 128)).translate(0, 0, -64).scale(scale).color(color));
p.part("lens-ring", (cylinder(10, 46, 12).rotate([1, 0, 0], 90).translate(0, -107, 128)).translate(0, 0, -64).scale(scale).color(color));
p.part("rangefinder-window", (cylinder(6, 18, 10).rotate([1, 0, 0], 90).translate(-65, -42, 162)).translate(0, 0, -64).scale(scale).color(color));
p.part("view-window", (cylinder(6, 17, 10).rotate([1, 0, 0], 90).translate(64, -42, 162)).translate(0, 0, -64).scale(scale).color(color));
p.part("rewind-knob", (cylinder(18, 22, 10).translate(-78, 5, 217)).translate(0, 0, -64).scale(scale).color(color));
p.part("advance-dial", (cylinder(12, 16, 10).translate(78, 5, 217)).translate(0, 0, -64).scale(scale).color(color));

return p.model();
