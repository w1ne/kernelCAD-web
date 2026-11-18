// Original kernelCAD low-poly handheld video camcorder with a long lens barrel, top handle, rear viewfinder and side hand strap.
// Millimetres, Z up, base on z = 0. Separate polymer, metal, optical glass and studio fabric zones keep the object readable and editable.

meta({
  name: "camcorder",
  license: 'CC0-1.0',
  title: "Camcorder",
  description: "Handheld video camcorder with a long lens barrel, top handle, rear viewfinder and side hand strap. Knobs: overall scale and polymer, metal, optical glass and studio fabric color controls. Presets: studioBlack and fieldRental.",
  tags: ["camcorder", "photography", "video", "studio", "low poly", "CC0"],
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
const p = assembly("camcorder");
p.part("body", (box(190, 115, 154, true).translate(0, 0, 154)).translate(0, 0, -77).scale(scale).color(polymer));
p.part("lens-barrel", (cylinder(148, 52, 12).rotate([1, 0, 0], 90).translate(5, -35, 156)).translate(0, 0, -77).scale(scale).color(metal));
p.part("lens-front", (cylinder(9, 45, 12).rotate([1, 0, 0], 90).translate(5, -176, 156)).translate(0, 0, -77).scale(scale).color(polymer));
p.part("top-handle", (box(118, 30, 22, true).translate(-10, 0, 248)).translate(0, 0, -77).scale(scale).color(polymer));
p.part("handle-post-left", (box(18, 24, 70, true).translate(-56, 0, 208)).translate(0, 0, -77).scale(scale).color(metal));
p.part("handle-post-right", (box(18, 24, 70, true).translate(36, 0, 208)).translate(0, 0, -77).scale(scale).color(metal));
p.part("viewfinder", (box(68, 82, 55, true).translate(-28, 40, 148)).translate(0, 0, -77).scale(scale).color(glass));
p.part("strap", (box(24, 104, 18, true).translate(94, 0, 154)).translate(0, 0, -77).scale(scale).color(fabric));

return p.model();
