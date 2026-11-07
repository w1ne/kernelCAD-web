// Original kernelCAD low-poly very short pancake lens with a wide front rim and thin knurled barrel rings.
// Millimetres, Z up, base on z = 0. Separate metal, optical glass and rubber zones keep the object readable and editable.

meta({
  name: "pancake-lens",
  license: 'CC0-1.0',
  title: "Pancake lens",
  description: "Very short pancake lens with a wide front rim and thin knurled barrel rings. Knobs: overall scale and metal, optical glass and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["pancake lens", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { metal: '#a9b5ba', glass: '#45a6c0', rubber: '#1b2024' },
  fieldRental: { metal: '#657780', glass: '#79d4e3', rubber: '#292b2d' },
});
const p = assembly("pancake-lens");
p.part("barrel", (cylinder(54, 58, 12)).translate(0, 0, 0).scale(scale).color(metal));
p.part("mount", (cylinder(14, 64, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(metal));
p.part("front-rim", (cylinder(12, 66, 12).translate(0, 0, 45)).translate(0, 0, 0).scale(scale).color(metal));
p.part("front-glass", (cylinder(5, 54, 12).translate(0, 0, 57)).translate(0, 0, 0).scale(scale).color(glass));
p.part("focus-band", (cylinder(12, 61, 12).translate(0, 0, 21)).translate(0, 0, 0).scale(scale).color(rubber));

return p.model();
