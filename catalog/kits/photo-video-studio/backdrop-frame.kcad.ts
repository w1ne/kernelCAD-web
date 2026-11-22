// Original kernelCAD low-poly portable backdrop frame with a wide crossbar, telescoping uprights, locking collars and feet.
// Millimetres, Z up, base on z = 0. Separate metal, polymer, rubber and studio fabric zones keep the object readable and editable.

meta({
  name: "backdrop-frame",
  license: 'CC0-1.0',
  title: "Backdrop frame",
  description: "Portable backdrop frame with a wide crossbar, telescoping uprights, locking collars and feet. Knobs: overall scale and metal, polymer, rubber and studio fabric color controls. Presets: studioBlack and fieldRental.",
  tags: ["backdrop frame", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });
const fabric = param('fabric', '#e5ddce', { label: 'Studio fabric' });

presets({
  studioBlack: { metal: '#a9b5ba', polymer: '#343c43', rubber: '#1b2024', fabric: '#e5ddce' },
  fieldRental: { metal: '#657780', polymer: '#c75a2e', rubber: '#292b2d', fabric: '#d6b365' },
});
const p = assembly("backdrop-frame");
p.part("crossbar", (cylinder(2600, 20, 8).rotate([0, 1, 0], 90).translate(0, 0, 2400)).translate(0, 0, 0).scale(scale).color(metal));
p.part("left-upright-lower", (cylinder(1260, 25, 8).translate(-1240, 0, 20)).translate(0, 0, 0).scale(scale).color(metal));
p.part("left-upright-upper", (cylinder(1120, 17, 8).translate(-1240, 0, 1260)).translate(0, 0, 0).scale(scale).color(metal));
p.part("right-upright-lower", (cylinder(1260, 25, 8).translate(1240, 0, 20)).translate(0, 0, 0).scale(scale).color(metal));
p.part("right-upright-upper", (cylinder(1120, 17, 8).translate(1240, 0, 1260)).translate(0, 0, 0).scale(scale).color(metal));
p.part("left-lock", (cylinder(30, 36, 8).translate(-1240, 0, 1210)).translate(0, 0, 0).scale(scale).color(polymer));
p.part("right-lock", (cylinder(30, 36, 8).translate(1240, 0, 1210)).translate(0, 0, 0).scale(scale).color(polymer));
p.part("left-foot", (box(72, 470, 28, true).translate(-1240, 0, 14)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("right-foot", (box(72, 470, 28, true).translate(1240, 0, 14)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("backdrop-panel", (box(2480, 12, 2260, true).translate(0, 4, 1240)).translate(0, 0, 0).scale(scale).color(fabric));

return p.model();
