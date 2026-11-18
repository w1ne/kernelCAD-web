// Original kernelCAD low-poly small point-and-shoot camera with a telescoping lens, rear screen and compact wrist loop.
// Millimetres, Z up, base on z = 0. Separate polymer, metal, optical glass and studio fabric zones keep the object readable and editable.

meta({
  name: "pocket-digital-camera",
  license: 'CC0-1.0',
  title: "Pocket digital camera",
  description: "Small point-and-shoot camera with a telescoping lens, rear screen and compact wrist loop. Knobs: overall scale and polymer, metal, optical glass and studio fabric color controls. Presets: studioBlack and fieldRental.",
  tags: ["pocket digital camera", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });
const fabric = param('fabric', '#e5ddce', { label: 'Studio fabric' });

presets({
  studioBlack: { polymer: '#343c43', metal: '#a9b5ba', glass: '#45a6c0', fabric: '#e5ddce' },
  fieldRental: { polymer: '#c75a2e', metal: '#657780', glass: '#79d4e3', fabric: '#d6b365' },
});
const p = assembly("pocket-digital-camera");
p.part("body", (box(150, 38, 96, true).translate(0, 0, 106)).translate(0, 0, -58).scale(scale).color(polymer));
p.part("lens-barrel", (cylinder(42, 31, 10).rotate([1, 0, 0], 90).translate(-20, -17, 108)).translate(0, 0, -58).scale(scale).color(metal));
p.part("lens-face", (cylinder(8, 24, 10).rotate([1, 0, 0], 90).translate(-20, -56, 108)).translate(0, 0, -58).scale(scale).color(glass));
p.part("rear-screen", (box(54, 5, 43, true).translate(35, 21, 109)).translate(0, 0, -58).scale(scale).color(glass));
p.part("flash-window", (box(24, 4, 14, true).translate(-48, -21, 142)).translate(0, 0, -58).scale(scale).color(glass));
p.part("wrist-loop", (box(10, 44, 10, true).translate(78, 20, 105)).translate(0, 0, -58).scale(scale).color(fabric));

return p.model();
