// Original kernelCAD low-poly circular ring light on an adjustable pole with a tripod foot and central phone holder.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "ring-light",
  license: 'CC0-1.0',
  title: "Ring light",
  description: "Circular ring light on an adjustable pole with a tripod foot and central phone holder. Knobs: overall scale and asset color.",
  tags: ["ring light", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#454b50", { label: 'Asset color' });
const p = assembly("ring-light");
p.part("light-ring", (cylinder(30, 160, 16).subtract(cylinder(32, 112, 16).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 800)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("phone-grip", (box(42, 30, 170, true).translate(0, -8, 800)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("phone-clamp-top", (box(88, 34, 22, true).translate(0, -8, 896)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("phone-clamp-bottom", (box(88, 34, 22, true).translate(0, -8, 704)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("pole", (cylinder(680, 17, 8).translate(0, 0, 100)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("hub", (cylinder(42, 34, 10).translate(0, 0, 95)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("leg-one", (box(42, 380, 26, true).rotate([0, 1, 0], 14).translate(0, 0, 26)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("leg-two", (box(42, 380, 26, true).rotate([0, 1, 0], -14).rotate([0, 0, 1], 120).translate(0, 0, 26)).translate(0, 0, -8.306).scale(scale).color(color));
p.part("leg-three", (box(42, 380, 26, true).rotate([0, 1, 0], -14).rotate([0, 0, 1], 240).translate(0, 0, 26)).translate(0, 0, -8.306).scale(scale).color(color));

return p.model();
