// Original kernelCAD low-poly box-style cinema camera with a matte box, lens rails, top handle and shoulder-mount plate.
// Millimetres, Z up, base on z = 0. Separate polymer, optical glass and metal zones keep the object readable and editable.

meta({
  name: "cinema-camera",
  license: 'CC0-1.0',
  title: "Cinema camera",
  description: "Box-style cinema camera with a matte box, lens rails, top handle and shoulder-mount plate. Knobs: overall scale and polymer, optical glass and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["cinema camera", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });

presets({
  studioBlack: { polymer: '#343c43', glass: '#45a6c0', metal: '#a9b5ba' },
  fieldRental: { polymer: '#c75a2e', glass: '#79d4e3', metal: '#657780' },
});
const p = assembly("cinema-camera");
p.part("body", (box(230, 130, 190, true).translate(0, 0, 198)).translate(0, 0, -79).scale(scale).color(polymer));
p.part("lens", (cylinder(145, 48, 12).rotate([1, 0, 0], 90).translate(0, -52, 206)).translate(0, 0, -79).scale(scale).color(glass));
p.part("matte-box", (box(148, 58, 116, true).translate(0, -181, 206)).translate(0, 0, -79).scale(scale).color(polymer));
p.part("matte-top-flag", (box(156, 65, 9, true).rotate([1, 0, 0], 12).translate(0, -177, 271)).translate(0, 0, -79).scale(scale).color(polymer));
p.part("rail-left", (cylinder(260, 9, 8).rotate([0, 1, 0], 90).translate(0, 30, 98)).translate(0, 0, -79).scale(scale).color(metal));
p.part("rail-right", (cylinder(260, 9, 8).rotate([0, 1, 0], 90).translate(0, -30, 98)).translate(0, 0, -79).scale(scale).color(metal));
p.part("top-handle", (box(124, 32, 24, true).translate(0, 0, 315)).translate(0, 0, -79).scale(scale).color(polymer));
p.part("base-plate", (box(218, 116, 22, true).translate(0, 0, 90)).translate(0, 0, -79).scale(scale).color(metal));

return p.model();
