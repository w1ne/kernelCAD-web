// Original kernelCAD low-poly short macro lens with a broad focusing ring, close-focus scale band and front filter rim.
// Millimetres, Z up, base on z = 0. Separate metal, rubber and optical glass zones keep the object readable and editable.

meta({
  name: "macro-lens",
  license: 'CC0-1.0',
  title: "Macro lens",
  description: "Short macro lens with a broad focusing ring, close-focus scale band and front filter rim. Knobs: overall scale and metal, rubber and optical glass color controls. Presets: studioBlack and fieldRental.",
  tags: ["macro lens", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });

presets({
  studioBlack: { metal: '#a9b5ba', rubber: '#1b2024', glass: '#45a6c0' },
  fieldRental: { metal: '#657780', rubber: '#292b2d', glass: '#79d4e3' },
});
const p = assembly("macro-lens");
p.part("barrel", (cylinder(138, 53, 12)).translate(0, 0, 0).scale(scale).color(metal));
p.part("mount", (cylinder(20, 59, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(metal));
p.part("focus-ring", (cylinder(44, 60, 12).translate(0, 0, 50)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("front-rim", (cylinder(14, 57, 12).translate(0, 0, 124)).translate(0, 0, 0).scale(scale).color(metal));
p.part("front-glass", (cylinder(5, 47, 12).translate(0, 0, 138)).translate(0, 0, 0).scale(scale).color(glass));
p.part("index-mark", (box(28, 5, 8, true).translate(0, -58, 95)).translate(0, 0, 0).scale(scale).color(metal));

return p.model();
