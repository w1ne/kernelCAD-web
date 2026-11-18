// Original kernelCAD low-poly square softbox with a broad front diffuser, tapered fabric body, rear mount and light stand.
// Millimetres, Z up, base on z = 0. Separate diffuser fabric, studio fabric, metal and rubber zones keep the object readable and editable.

meta({
  name: "softbox-light",
  license: 'CC0-1.0',
  title: "Softbox light",
  description: "Square softbox with a broad front diffuser, tapered fabric body, rear mount and light stand. Knobs: overall scale and diffuser fabric, studio fabric, metal and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["softbox light", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const diffusionFabric = param('diffusionFabric', '#fff7e8', { label: 'Diffuser fabric' });
const fabric = param('fabric', '#e5ddce', { label: 'Studio fabric' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { diffusionFabric: '#fff7e8', fabric: '#e5ddce', metal: '#a9b5ba', rubber: '#1b2024' },
  fieldRental: { diffusionFabric: '#fff0c8', fabric: '#d6b365', metal: '#657780', rubber: '#292b2d' },
});
const p = assembly("softbox-light");
p.part("front-diffuser", (box(360, 22, 360, true).translate(0, -15, 860)).translate(0, 0, -7.5).scale(scale).color(diffusionFabric));
p.part("side-left", (box(72, 130, 330, true).rotate([0, 1, 0], -25).translate(-184, 36, 860)).translate(0, 0, -7.5).scale(scale).color(fabric));
p.part("side-right", (box(72, 130, 330, true).rotate([0, 1, 0], 25).translate(184, 36, 860)).translate(0, 0, -7.5).scale(scale).color(fabric));
p.part("top-side", (box(330, 130, 72, true).rotate([1, 0, 0], -25).translate(0, 36, 1044)).translate(0, 0, -7.5).scale(scale).color(fabric));
p.part("bottom-side", (box(330, 130, 72, true).rotate([1, 0, 0], 25).translate(0, 36, 676)).translate(0, 0, -7.5).scale(scale).color(fabric));
p.part("rear-mount", (cylinder(44, 40, 10).rotate([1, 0, 0], 90).translate(0, 98, 860)).translate(0, 0, -7.5).scale(scale).color(metal));
p.part("stand-pole", (cylinder(680, 18, 8).translate(0, 98, 90)).translate(0, 0, -7.5).scale(scale).color(metal));
p.part("stand-base", (box(36, 370, 25, true).translate(0, 98, 20)).translate(0, 0, -7.5).scale(scale).color(rubber));

return p.model();
