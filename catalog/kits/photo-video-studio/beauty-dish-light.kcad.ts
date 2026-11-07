// Original kernelCAD low-poly shallow beauty-dish reflector with a raised center deflector, rim and support yoke.
// Millimetres, Z up, base on z = 0. Separate metal, diffuser polycarbonate and rubber zones keep the object readable and editable.

meta({
  name: "beauty-dish-light",
  license: 'CC0-1.0',
  title: "Beauty dish light",
  description: "Shallow beauty-dish reflector with a raised center deflector, rim and support yoke. Knobs: overall scale and metal, diffuser polycarbonate and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["beauty dish light", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const polycarbonate = param('polycarbonate', '#d7e4e3', { label: 'Diffuser polycarbonate' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { metal: '#a9b5ba', polycarbonate: '#d7e4e3', rubber: '#1b2024' },
  fieldRental: { metal: '#657780', polycarbonate: '#f0c75a', rubber: '#292b2d' },
});
const p = assembly("beauty-dish-light");
p.part("dish", (sphere(170).scale([1, 0.22, 1]).translate(0, -28, 760)).translate(0, 0, 0).scale(scale).color(metal));
p.part("outer-rim", (cylinder(16, 173, 16).rotate([1, 0, 0], 90).translate(0, -22, 760)).translate(0, 0, 0).scale(scale).color(metal));
p.part("center-deflector", (sphere(44).scale([1, 0.3, 1]).translate(0, -67, 760)).translate(0, 0, 0).scale(scale).color(polycarbonate));
p.part("stem", (cylinder(80, 17, 10).rotate([1, 0, 0], 90).translate(0, 12, 760)).translate(0, 0, 0).scale(scale).color(metal));
p.part("yoke-left", (box(20, 28, 260, true).translate(-155, 20, 640)).translate(0, 0, 0).scale(scale).color(metal));
p.part("yoke-right", (box(20, 28, 260, true).translate(155, 20, 640)).translate(0, 0, 0).scale(scale).color(metal));
p.part("stand-pole", (cylinder(690, 18, 8).translate(0, 0, 20)).translate(0, 0, 0).scale(scale).color(metal));
p.part("stand-foot", (box(34, 340, 24, true).translate(0, 0, 12)).translate(0, 0, 0).scale(scale).color(rubber));

return p.model();
