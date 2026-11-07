// Original kernelCAD low-poly interchangeable-lens DSLR with a deep grip, raised optical viewfinder, shutter dial and zoom lens.
// Millimetres, Z up, base on z = 0. Separate polymer, rubber, optical glass and metal zones keep the object readable and editable.

meta({
  name: "digital-slr-camera",
  license: 'CC0-1.0',
  title: "Digital SLR camera",
  description: "Interchangeable-lens DSLR with a deep grip, raised optical viewfinder, shutter dial and zoom lens. Knobs: overall scale and polymer, rubber, optical glass and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["digital slr camera", "photography", "video", "studio", "low poly", "CC0"],
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
const p = assembly("digital-slr-camera");
p.part("body", (box(242, 112, 170, true).translate(0, 0, 144)).translate(0, 0, -59).scale(scale).color(polymer));
p.part("grip", (box(62, 105, 150, true).translate(119, -4, 139)).translate(0, 0, -59).scale(scale).color(rubber));
p.part("prism-hump", (box(100, 82, 52, true).translate(-6, 0, 246)).translate(0, 0, -59).scale(scale).color(polymer));
p.part("viewfinder", (box(54, 56, 30, true).translate(-6, -5, 285)).translate(0, 0, -59).scale(scale).color(glass));
p.part("lens-barrel", (cylinder(130, 58, 12).rotate([1, 0, 0], 90).translate(-8, -43, 147)).translate(0, 0, -59).scale(scale).color(metal));
p.part("lens-ring", (cylinder(12, 64, 12).rotate([1, 0, 0], 90).translate(-8, -166, 147)).translate(0, 0, -59).scale(scale).color(metal));
p.part("lens-face", (cylinder(8, 48, 12).rotate([1, 0, 0], 90).translate(-8, -177, 147)).translate(0, 0, -59).scale(scale).color(glass));
p.part("top-dial", (cylinder(12, 18, 8).translate(72, 20, 234)).translate(0, 0, -59).scale(scale).color(metal));

return p.model();
