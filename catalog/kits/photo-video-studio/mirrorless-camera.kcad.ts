// Original kernelCAD low-poly compact mirrorless camera with a flat-top body, electronic viewfinder, hand grip and interchangeable lens.
// Millimetres, Z up, base on z = 0. Separate polymer, rubber, optical glass and metal zones keep the object readable and editable.

meta({
  name: "mirrorless-camera",
  license: 'CC0-1.0',
  title: "Mirrorless camera",
  description: "Compact mirrorless camera with a flat-top body, electronic viewfinder, hand grip and interchangeable lens. Knobs: overall scale and polymer, rubber, optical glass and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["mirrorless camera", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });

presets({
  studioBlack: { polymer: '#343c43', rubber: '#1b2024', glass: '#45a6c0', metal: '#a9b5ba' },
  fieldRental: { polymer: '#c75a2e', rubber: '#292b2d', glass: '#79d4e3', metal: '#657780' },
});
const p = assembly("mirrorless-camera");
p.part("body", (box(214, 92, 132, true).translate(0, 0, 132)).translate(0, 0, -66).scale(scale).color(polymer));
p.part("grip", (box(54, 86, 116, true).translate(107, -1, 128)).translate(0, 0, -66).scale(scale).color(rubber));
p.part("viewfinder", (box(66, 58, 48, true).translate(-30, 0, 222)).translate(0, 0, -66).scale(scale).color(glass));
p.part("lens", (cylinder(112, 49, 12).rotate([1, 0, 0], 90).translate(-10, -38, 136)).translate(0, 0, -66).scale(scale).color(glass));
p.part("front-ring", (cylinder(12, 56, 12).rotate([1, 0, 0], 90).translate(-10, -144, 136)).translate(0, 0, -66).scale(scale).color(metal));
p.part("mode-dial", (cylinder(12, 16, 8).translate(-65, 18, 204)).translate(0, 0, -66).scale(scale).color(metal));
p.part("hot-shoe", (box(46, 20, 8, true).translate(27, 0, 202)).translate(0, 0, -66).scale(scale).color(metal));

return p.model();
