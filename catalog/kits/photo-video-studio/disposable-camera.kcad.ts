// Original kernelCAD low-poly simple single-use film camera with a view window, flash panel, shutter button and fixed lens.
// Millimetres, Z up, base on z = 0. Separate polymer, optical glass and metal zones keep the object readable and editable.

meta({
  name: "disposable-camera",
  license: 'CC0-1.0',
  title: "Disposable film camera",
  description: "Simple single-use film camera with a view window, flash panel, shutter button and fixed lens. Knobs: overall scale and polymer, optical glass and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["disposable camera", "photography", "video", "studio", "low poly", "CC0"],
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
const p = assembly("disposable-camera");
p.part("shell", (box(178, 70, 118, true).translate(0, 0, 125)).translate(0, 0, -66).scale(scale).color(polymer));
p.part("lens", (cylinder(38, 30, 10).rotate([1, 0, 0], 90).translate(0, -32, 122)).translate(0, 0, -66).scale(scale).color(glass));
p.part("lens-rim", (cylinder(9, 38, 10).rotate([1, 0, 0], 90).translate(0, -67, 122)).translate(0, 0, -66).scale(scale).color(metal));
p.part("flash", (box(40, 5, 28, true).translate(57, -37, 162)).translate(0, 0, -66).scale(scale).color(glass));
p.part("view-window", (box(34, 6, 22, true).translate(-58, -38, 154)).translate(0, 0, -66).scale(scale).color(glass));
p.part("shutter", (cylinder(8, 12, 8).translate(-63, 0, 186)).translate(0, 0, -66).scale(scale).color(polymer));

return p.model();
