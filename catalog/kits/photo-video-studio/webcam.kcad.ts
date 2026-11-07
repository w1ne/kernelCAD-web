// Original kernelCAD low-poly compact clip-on webcam with a centered lens, side microphones and a folding monitor mount.
// Millimetres, Z up, base on z = 0. Separate polymer, optical glass and metal zones keep the object readable and editable.

meta({
  name: "webcam",
  license: 'CC0-1.0',
  title: "Webcam",
  description: "Compact clip-on webcam with a centered lens, side microphones and a folding monitor mount. Knobs: overall scale and polymer, optical glass and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["webcam", "photography", "video", "studio", "low poly", "CC0"],
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
const p = assembly("webcam");
p.part("camera-body", (box(146, 54, 52, true).translate(0, 0, 103)).translate(0, 0, -9).scale(scale).color(polymer));
p.part("lens", (cylinder(35, 24, 10).rotate([1, 0, 0], 90).translate(0, -23, 103)).translate(0, 0, -9).scale(scale).color(glass));
p.part("left-mic", (cylinder(10, 5, 8).rotate([1, 0, 0], 90).translate(-57, -27, 115)).translate(0, 0, -9).scale(scale).color(metal));
p.part("right-mic", (cylinder(10, 5, 8).rotate([1, 0, 0], 90).translate(57, -27, 115)).translate(0, 0, -9).scale(scale).color(metal));
p.part("neck", (box(26, 24, 30, true).translate(0, 7, 62)).translate(0, 0, -9).scale(scale).color(polymer));
p.part("monitor-clip", (box(108, 76, 18, true).translate(0, 18, 27)).translate(0, 0, -9).scale(scale).color(polymer));
p.part("clip-lip", (box(108, 24, 12, true).translate(0, -5, 15)).translate(0, 0, -9).scale(scale).color(polymer));

return p.model();
