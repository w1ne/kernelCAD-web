// Original kernelCAD low-poly stack of three circular photographic filters with stepped rims and a compact storage case.
// Millimetres, Z up, base on z = 0. Separate optical glass, metal and polymer zones keep the object readable and editable.

meta({
  name: "lens-filter-set",
  license: 'CC0-1.0',
  title: "Lens filter set",
  description: "Stack of three circular photographic filters with stepped rims and a compact storage case. Knobs: overall scale and optical glass, metal and polymer color controls. Presets: studioBlack and fieldRental.",
  tags: ["lens filter set", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });

presets({
  studioBlack: { glass: '#45a6c0', metal: '#a9b5ba', polymer: '#343c43' },
  fieldRental: { glass: '#79d4e3', metal: '#657780', polymer: '#c75a2e' },
});
const p = assembly("lens-filter-set");
p.part("filter-one", (cylinder(8, 78, 16)).translate(0, 0, 0).scale(scale).color(glass));
p.part("filter-one-rim", (cylinder(8, 84, 16).translate(0, 0, 8)).translate(0, 0, 0).scale(scale).color(metal));
p.part("filter-two", (cylinder(8, 72, 16).translate(190, 0, 0)).translate(0, 0, 0).scale(scale).color(glass));
p.part("filter-two-rim", (cylinder(8, 78, 16).translate(190, 0, 8)).translate(0, 0, 0).scale(scale).color(metal));
p.part("filter-three", (cylinder(8, 66, 16).translate(-190, 0, 0)).translate(0, 0, 0).scale(scale).color(glass));
p.part("filter-three-rim", (cylinder(8, 72, 16).translate(-190, 0, 8)).translate(0, 0, 0).scale(scale).color(metal));
p.part("case", (box(440, 116, 30, true).translate(0, 150, 15)).translate(0, 0, 0).scale(scale).color(polymer));

return p.model();
