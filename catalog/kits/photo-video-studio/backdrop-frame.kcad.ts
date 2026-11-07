// Original kernelCAD low-poly portable backdrop frame with a wide crossbar, telescoping uprights, locking collars and feet.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "backdrop-frame",
  license: 'CC0-1.0',
  title: "Backdrop frame",
  description: "Portable backdrop frame with a wide crossbar, telescoping uprights, locking collars and feet. Knobs: overall scale and asset color.",
  tags: ["backdrop frame", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#535a60", { label: 'Asset color' });
const p = assembly("backdrop-frame");
p.part("crossbar", (cylinder(2600, 20, 8).rotate([0, 1, 0], 90).translate(0, 0, 2400)).translate(0, 0, 0).scale(scale).color(color));
p.part("left-upright-lower", (cylinder(1260, 25, 8).translate(-1240, 0, 20)).translate(0, 0, 0).scale(scale).color(color));
p.part("left-upright-upper", (cylinder(1120, 17, 8).translate(-1240, 0, 1260)).translate(0, 0, 0).scale(scale).color(color));
p.part("right-upright-lower", (cylinder(1260, 25, 8).translate(1240, 0, 20)).translate(0, 0, 0).scale(scale).color(color));
p.part("right-upright-upper", (cylinder(1120, 17, 8).translate(1240, 0, 1260)).translate(0, 0, 0).scale(scale).color(color));
p.part("left-lock", (cylinder(30, 36, 8).translate(-1240, 0, 1210)).translate(0, 0, 0).scale(scale).color(color));
p.part("right-lock", (cylinder(30, 36, 8).translate(1240, 0, 1210)).translate(0, 0, 0).scale(scale).color(color));
p.part("left-foot", (box(72, 470, 28, true).translate(-1240, 0, 14)).translate(0, 0, 0).scale(scale).color(color));
p.part("right-foot", (box(72, 470, 28, true).translate(1240, 0, 14)).translate(0, 0, 0).scale(scale).color(color));
p.part("backdrop-panel", (box(2480, 12, 2260, true).translate(0, 4, 1240)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
