// Original kernelCAD low-poly three-section camera tripod with a quick-release head, center column, splayed legs and rubber feet.
// Millimetres, Z up, base on z = 0. Separate metal and rubber zones keep the object readable and editable.

meta({
  name: "camera-tripod",
  license: 'CC0-1.0',
  title: "Camera tripod",
  description: "Three-section camera tripod with a quick-release head, center column, splayed legs and rubber feet. Knobs: overall scale and metal and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["camera tripod", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { metal: '#a9b5ba', rubber: '#1b2024' },
  fieldRental: { metal: '#657780', rubber: '#292b2d' },
});
const p = assembly("camera-tripod");
p.part("center-column", (cylinder(500, 24, 8).translate(0, 0, 320)).translate(0, 0, 0).scale(scale).color(metal));
p.part("head", (cylinder(90, 58, 10).translate(0, 0, 804)).translate(0, 0, 0).scale(scale).color(metal));
p.part("quick-plate", (box(116, 84, 24, true).translate(0, 0, 860)).translate(0, 0, 0).scale(scale).color(metal));
p.part("leg-one", (box(44, 44, 820, true).rotate([0, 1, 0], 22).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(metal));
p.part("leg-two", (box(44, 44, 820, true).rotate([0, 1, 0], 22).rotate([0, 0, 1], 120).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(metal));
p.part("leg-three", (box(44, 44, 820, true).rotate([0, 1, 0], 22).rotate([0, 0, 1], 240).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(metal));
p.part("foot-one", (box(60, 60, 28, true).translate(-150, 0, 14)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("foot-two", (box(60, 60, 28, true).translate(75, -130, 14)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("foot-three", (box(60, 60, 28, true).translate(75, 130, 14)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("brace-one", (box(18, 360, 16, true).rotate([0, 1, 0], 20).translate(0, 0, 510)).translate(0, 0, 0).scale(scale).color(metal));
p.part("brace-two", (box(18, 360, 16, true).rotate([0, 1, 0], -20).rotate([0, 0, 1], 120).translate(0, 0, 510)).translate(0, 0, 0).scale(scale).color(metal));
p.part("brace-three", (box(18, 360, 16, true).rotate([0, 1, 0], -20).rotate([0, 0, 1], 240).translate(0, 0, 510)).translate(0, 0, 0).scale(scale).color(metal));

return p.model();
