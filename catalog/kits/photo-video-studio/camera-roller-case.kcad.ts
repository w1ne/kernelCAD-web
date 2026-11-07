// Original kernelCAD low-poly protective wheeled camera case with reinforced corners, pull handle and four low-profile casters.
// Millimetres, Z up, base on z = 0. Separate polymer, metal and rubber zones keep the object readable and editable.

meta({
  name: "camera-roller-case",
  license: 'CC0-1.0',
  title: "Camera roller case",
  description: "Protective wheeled camera case with reinforced corners, pull handle and four low-profile casters. Knobs: overall scale and polymer, metal and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["camera roller case", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { polymer: '#343c43', metal: '#a9b5ba', rubber: '#1b2024' },
  fieldRental: { polymer: '#c75a2e', metal: '#657780', rubber: '#292b2d' },
});
const p = assembly("camera-roller-case");
p.part("case", (box(540, 360, 460, true).translate(0, 0, 250)).translate(0, 0, -6).scale(scale).color(polymer));
p.part("lid", (box(550, 372, 82, true).translate(0, 0, 520)).translate(0, 0, -6).scale(scale).color(polymer));
p.part("handle", (box(220, 30, 36, true).translate(0, 195, 485)).translate(0, 0, -6).scale(scale).color(polymer));
p.part("handle-post-left", (box(22, 24, 120, true).translate(-88, 192, 420)).translate(0, 0, -6).scale(scale).color(metal));
p.part("handle-post-right", (box(22, 24, 120, true).translate(88, 192, 420)).translate(0, 0, -6).scale(scale).color(metal));
p.part("latch-left", (box(36, 22, 66, true).translate(-184, -192, 438)).translate(0, 0, -6).scale(scale).color(metal));
p.part("latch-right", (box(36, 22, 66, true).translate(184, -192, 438)).translate(0, 0, -6).scale(scale).color(metal));
p.part("wheel-left-front", (cylinder(36, 46, 10).rotate([1, 0, 0], 90).translate(-210, -160, 52)).translate(0, 0, -6).scale(scale).color(rubber));
p.part("wheel-right-front", (cylinder(36, 46, 10).rotate([1, 0, 0], 90).translate(210, -160, 52)).translate(0, 0, -6).scale(scale).color(rubber));
p.part("wheel-left-back", (cylinder(36, 46, 10).rotate([1, 0, 0], 90).translate(-210, 160, 52)).translate(0, 0, -6).scale(scale).color(rubber));
p.part("wheel-right-back", (cylinder(36, 46, 10).rotate([1, 0, 0], 90).translate(210, 160, 52)).translate(0, 0, -6).scale(scale).color(rubber));

return p.model();
