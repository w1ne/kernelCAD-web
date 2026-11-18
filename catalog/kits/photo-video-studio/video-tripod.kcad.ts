// Original kernelCAD low-poly heavy video tripod with a fluid head, long pan handle, center spreader, splayed legs and rubber feet.
// Millimetres, Z up, base on z = 0. Separate metal and rubber zones keep the object readable and editable.

meta({
  name: "video-tripod",
  license: 'CC0-1.0',
  title: "Video tripod",
  description: "Heavy video tripod with a fluid head, long pan handle, center spreader, splayed legs and rubber feet. Knobs: overall scale and metal and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["video tripod", "photography", "video", "studio", "low poly", "CC0"],
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
const p = assembly("video-tripod");
p.part("bowl-head", (cylinder(80, 90, 12).translate(0, 0, 820)).translate(0, 0, 0).scale(scale).color(metal));
p.part("fluid-head", (box(148, 122, 110, true).translate(0, 0, 900)).translate(0, 0, 0).scale(scale).color(metal));
p.part("quick-plate", (box(174, 108, 24, true).translate(0, 0, 967)).translate(0, 0, 0).scale(scale).color(metal));
p.part("pan-handle", (cylinder(470, 12, 8).rotate([0, 1, 0], 90).translate(50, 0, 944)).translate(0, 0, 0).scale(scale).color(metal));
p.part("handle-grip", (cylinder(106, 24, 10).rotate([0, 1, 0], 90).translate(500, 0, 944)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("center-column", (cylinder(150, 30, 10).translate(0, 0, 720)).translate(0, 0, 0).scale(scale).color(metal));
p.part("leg-one", (box(60, 60, 820, true).rotate([0, 1, 0], 25).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(metal));
p.part("leg-two", (box(60, 60, 820, true).rotate([0, 1, 0], 25).rotate([0, 0, 1], 120).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(metal));
p.part("leg-three", (box(60, 60, 820, true).rotate([0, 1, 0], 25).rotate([0, 0, 1], 240).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(metal));
p.part("foot-one", (box(76, 76, 38, true).translate(-170, 0, 19)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("foot-two", (box(76, 76, 38, true).translate(85, -147, 19)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("foot-three", (box(76, 76, 38, true).translate(85, 147, 19)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("spreader", (box(28, 360, 22, true).translate(0, 0, 375)).translate(0, 0, 0).scale(scale).color(metal));

return p.model();
