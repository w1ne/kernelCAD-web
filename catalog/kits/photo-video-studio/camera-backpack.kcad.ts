// Original kernelCAD low-poly padded camera backpack with front flap, shoulder straps, side pockets and a top grab handle.
// Millimetres, Z up, base on z = 0. Separate studio fabric, polymer and rubber zones keep the object readable and editable.

meta({
  name: "camera-backpack",
  license: 'CC0-1.0',
  title: "Camera backpack",
  description: "Padded camera backpack with front flap, shoulder straps, side pockets and a top grab handle. Knobs: overall scale and studio fabric, polymer and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["camera backpack", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const fabric = param('fabric', '#e5ddce', { label: 'Studio fabric' });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { fabric: '#e5ddce', polymer: '#343c43', rubber: '#1b2024' },
  fieldRental: { fabric: '#d6b365', polymer: '#c75a2e', rubber: '#292b2d' },
});
const p = assembly("camera-backpack");
p.part("main-pack", (box(360, 250, 520, true).translate(0, 20, 300)).translate(0, 0, -40).scale(scale).color(fabric));
p.part("front-flap", (box(370, 48, 190, true).translate(0, -129, 452)).translate(0, 0, -40).scale(scale).color(polymer));
p.part("top-pocket", (box(240, 42, 104, true).translate(0, -148, 278)).translate(0, 0, -40).scale(scale).color(fabric));
p.part("side-pocket-left", (box(72, 94, 236, true).translate(-216, 40, 210)).translate(0, 0, -40).scale(scale).color(polymer));
p.part("side-pocket-right", (box(72, 94, 236, true).translate(216, 40, 210)).translate(0, 0, -40).scale(scale).color(polymer));
p.part("strap-left", (box(64, 80, 430, true).rotate([0, 1, 0], -7).translate(-132, 164, 300)).translate(0, 0, -40).scale(scale).color(fabric));
p.part("strap-right", (box(64, 80, 430, true).rotate([0, 1, 0], 7).translate(132, 164, 300)).translate(0, 0, -40).scale(scale).color(fabric));
p.part("grab-handle", (box(134, 36, 40, true).translate(0, 30, 578)).translate(0, 0, -40).scale(scale).color(rubber));

return p.model();
