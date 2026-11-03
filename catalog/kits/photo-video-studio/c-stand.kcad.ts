// Original kernelCAD low-poly c-stand with a weighted three-leg base, telescoping column, grip head and horizontal arm.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "c-stand",
  license: 'CC0-1.0',
  title: "C-stand",
  description: "C-stand with a weighted three-leg base, telescoping column, grip head and horizontal arm. Knobs: overall scale and asset color.",
  tags: ["c stand", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#51575b", { label: 'Asset color' });
const p = assembly("c-stand");
p.part("column", (cylinder(1220, 24, 8).translate(0, 0, 70)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("upper-column", (cylinder(520, 16, 8).translate(0, 0, 1220)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("grip-head", (box(78, 64, 40, true).translate(0, 0, 1228)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("arm", (cylinder(560, 15, 8).rotate([0, 1, 0], 90).translate(0, 0, 1248)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("arm-grip", (cylinder(22, 32, 10).rotate([1, 0, 0], 90).translate(232, 0, 1248)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("base-hub", (cylinder(50, 45, 10).translate(0, 0, 48)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("leg-one", (box(44, 460, 30, true).rotate([0, 1, 0], 10).translate(0, 0, 20)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("leg-two", (box(44, 390, 30, true).rotate([0, 1, 0], -8).rotate([0, 0, 1], 120).translate(0, 0, 20)).translate(0, 0, -1.408).scale(scale).color(color));
p.part("leg-three", (box(44, 340, 30, true).rotate([0, 1, 0], -8).rotate([0, 0, 1], 240).translate(0, 0, 20)).translate(0, 0, -1.408).scale(scale).color(color));

return p.model();
