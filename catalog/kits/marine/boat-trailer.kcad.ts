// Original kernelCAD low-poly single-axle boat trailer with a winch post, keel rollers, twin bunks and road wheels.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "boat-trailer",
  license: 'CC0-1.0',
  title: "Boat trailer",
  description: "Single-axle boat trailer with a winch post, keel rollers, twin bunks and road wheels. Knobs: overall scale and asset color.",
  tags: ["boat trailer", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#464b4f", { label: 'Asset color' });
const p = assembly("boat-trailer");
p.part("main-beam", (box(1160, 90, 96, true).translate(-50, 0, 475)).translate(0, 0, 0).scale(scale).color(color));
p.part("axle", (cylinder(840, 34, 10).rotate([1, 0, 0], -90).translate(-100, -420, 410)).translate(0, 0, 0).scale(scale).color(color));
p.part("wheel-left", (cylinder(72, 130, 12).rotate([1, 0, 0], 90).translate(-100, -384, 410)).translate(0, 0, 0).scale(scale).color(color));
p.part("wheel-right", (cylinder(72, 130, 12).rotate([1, 0, 0], 90).translate(-100, 456, 410)).translate(0, 0, 0).scale(scale).color(color));
p.part("bunk-left", (box(920, 38, 45, true).rotate([0, 1, 0], -7).translate(60, -165, 544)).translate(0, 0, 0).scale(scale).color(color));
p.part("bunk-right", (box(920, 38, 45, true).rotate([0, 1, 0], -7).translate(60, 165, 544)).translate(0, 0, 0).scale(scale).color(color));
p.part("winch-post", (box(50, 80, 420, true).rotate([0, 1, 0], 10).translate(500, 0, 625)).translate(0, 0, 0).scale(scale).color(color));
p.part("winch-drum", (cylinder(100, 42, 10).rotate([0, 1, 0], 90).translate(510, 0, 816)).translate(0, 0, 0).scale(scale).color(color));
p.part("coupler", (box(180, 90, 60, true).translate(660, 0, 485)).translate(0, 0, 0).scale(scale).color(color));
p.part("jack-post", (cylinder(420, 22, 8).translate(570, 0, 20)).translate(0, 0, 0).scale(scale).color(color));
p.part("jack-foot", (cylinder(24, 65, 10).translate(570, 0, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
