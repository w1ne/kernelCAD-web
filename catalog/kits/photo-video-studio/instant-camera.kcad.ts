// Original kernelCAD low-poly instant-print camera with a square front lens, viewfinder windows and a broad picture ejection slot.
// Millimetres, Z up, base on z = 0. Separate polymer, optical glass and metal zones keep the object readable and editable.

meta({
  name: "instant-camera",
  license: 'CC0-1.0',
  title: "Instant camera",
  description: "Instant-print camera with a square front lens, viewfinder windows and a broad picture ejection slot. Knobs: overall scale and polymer, optical glass and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["instant camera", "photography", "video", "studio", "low poly", "CC0"],
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
const p = assembly("instant-camera");
p.part("body", (box(204, 136, 205, true).translate(0, 0, 168)).translate(0, 0, -65.5).scale(scale).color(polymer));
p.part("top-housing", (box(182, 112, 48, true).translate(0, 2, 296)).translate(0, 0, -65.5).scale(scale).color(polymer));
p.part("lens", (cylinder(66, 48, 12).rotate([1, 0, 0], 90).translate(0, -58, 169)).translate(0, 0, -65.5).scale(scale).color(glass));
p.part("lens-rim", (cylinder(10, 57, 12).rotate([1, 0, 0], 90).translate(0, -121, 169)).translate(0, 0, -65.5).scale(scale).color(metal));
p.part("viewfinder-left", (box(34, 8, 28, true).translate(-66, -69, 253)).translate(0, 0, -65.5).scale(scale).color(glass));
p.part("viewfinder-right", (box(34, 8, 28, true).translate(66, -69, 253)).translate(0, 0, -65.5).scale(scale).color(glass));
p.part("eject-slot", (box(124, 8, 12, true).translate(0, -70, 75)).translate(0, 0, -65.5).scale(scale).color(polymer));

return p.model();
