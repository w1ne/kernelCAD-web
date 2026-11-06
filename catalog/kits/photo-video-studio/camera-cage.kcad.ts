// Original kernelCAD low-poly open camera cage with top handle, side rails, accessory shoe and a wide quick-release base.
// Millimetres, Z up, base on z = 0. Separate metal, polymer and rubber zones keep the object readable and editable.

meta({
  name: "camera-cage",
  license: 'CC0-1.0',
  title: "Camera cage",
  description: "Open camera cage with top handle, side rails, accessory shoe and a wide quick-release base. Knobs: overall scale and metal, polymer and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["camera cage", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { metal: '#a9b5ba', polymer: '#343c43', rubber: '#1b2024' },
  fieldRental: { metal: '#657780', polymer: '#c75a2e', rubber: '#292b2d' },
});
const p = assembly("camera-cage");
p.part("base-plate", (box(220, 176, 24, true).translate(0, 0, 55)).translate(0, 0, -43).scale(scale).color(metal));
p.part("camera-body", (box(148, 94, 116, true).translate(0, 0, 160)).translate(0, 0, -43).scale(scale).color(polymer));
p.part("left-rail", (box(20, 22, 300, true).translate(-112, 0, 196)).translate(0, 0, -43).scale(scale).color(metal));
p.part("right-rail", (box(20, 22, 300, true).translate(112, 0, 196)).translate(0, 0, -43).scale(scale).color(metal));
p.part("top-rail", (box(244, 26, 22, true).translate(0, 0, 336)).translate(0, 0, -43).scale(scale).color(metal));
p.part("top-handle", (box(138, 44, 26, true).translate(0, 0, 374)).translate(0, 0, -43).scale(scale).color(metal));
p.part("shoe-mount", (box(44, 30, 18, true).translate(0, 0, 360)).translate(0, 0, -43).scale(scale).color(metal));
p.part("left-grip", (box(36, 82, 110, true).translate(-156, 0, 195)).translate(0, 0, -43).scale(scale).color(rubber));
p.part("right-grip", (box(36, 82, 110, true).translate(156, 0, 195)).translate(0, 0, -43).scale(scale).color(rubber));

return p.model();
