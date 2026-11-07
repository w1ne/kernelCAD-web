// Original kernelCAD low-poly reversible petal-style lens hood with a wide opening, four shallow hood petals and a bayonet base.
// Millimetres, Z up, base on z = 0. Separate polymer and metal zones keep the object readable and editable.

meta({
  name: "lens-hood",
  license: 'CC0-1.0',
  title: "Lens hood",
  description: "Reversible petal-style lens hood with a wide opening, four shallow hood petals and a bayonet base. Knobs: overall scale and polymer and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["lens hood", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });

presets({
  studioBlack: { polymer: '#343c43', metal: '#a9b5ba' },
  fieldRental: { polymer: '#c75a2e', metal: '#657780' },
});
const p = assembly("lens-hood");
p.part("tube", (cylinder(110, 70, 12).subtract(cylinder(112, 57, 12).translate(0, 0, -1))).translate(0, 0, 0).scale(scale).color(polymer));
p.part("bayonet-ring", (cylinder(20, 64, 12).subtract(cylinder(22, 54, 12).translate(0, 0, -1))).translate(0, 0, 0).scale(scale).color(metal));
p.part("petal-left", (box(32, 16, 96, true).rotate([0, 1, 0], 18).translate(-43, 0, 62)).translate(0, 0, 0).scale(scale).color(polymer));
p.part("petal-right", (box(32, 16, 96, true).rotate([0, 1, 0], -18).translate(43, 0, 62)).translate(0, 0, 0).scale(scale).color(polymer));
p.part("petal-front", (box(96, 16, 32, true).rotate([1, 0, 0], 18).translate(0, -10, 108)).translate(0, 0, 0).scale(scale).color(polymer));

return p.model();
