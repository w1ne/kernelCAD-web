// Original kernelCAD low-poly portable light stand with a three-foot base, nested riser sections, locking collars and spigot.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "light-stand",
  license: 'CC0-1.0',
  title: "Light stand",
  description: "Portable light stand with a three-foot base, nested riser sections, locking collars and spigot. Knobs: overall scale and asset color.",
  tags: ["light stand", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4c5359", { label: 'Asset color' });
const p = assembly("light-stand");
p.part("lower-pole", (cylinder(550, 25, 8).translate(0, 0, 70)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("upper-pole", (cylinder(500, 17, 8).translate(0, 0, 600)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("spigot", (cylinder(80, 11, 8).translate(0, 0, 1095)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("lock-one", (cylinder(28, 34, 8).translate(0, 0, 590)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("lock-two", (cylinder(24, 32, 8).translate(0, 0, 1066)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("hub", (cylinder(44, 42, 10).translate(0, 0, 62)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("leg-one", (box(38, 390, 26, true).rotate([0, 1, 0], 16).translate(0, 0, 20)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("leg-two", (box(38, 390, 26, true).rotate([0, 1, 0], -16).rotate([0, 0, 1], 120).translate(0, 0, 20)).translate(0, 0, -2.266).scale(scale).color(color));
p.part("leg-three", (box(38, 390, 26, true).rotate([0, 1, 0], -16).rotate([0, 0, 1], 240).translate(0, 0, 20)).translate(0, 0, -2.266).scale(scale).color(color));

return p.model();
