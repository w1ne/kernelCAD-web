// Original kernelCAD low-poly medium portrait prime lens with a stepped barrel, focus ring and broad front element.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "portrait-lens",
  license: 'CC0-1.0',
  title: "Portrait lens",
  description: "Medium portrait prime lens with a stepped barrel, focus ring and broad front element. Knobs: overall scale and asset color.",
  tags: ["portrait lens", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#383f45", { label: 'Asset color' });
const p = assembly("portrait-lens");
p.part("barrel", (cylinder(176, 52, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount", (cylinder(22, 61, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("focus-ring", (cylinder(48, 62, 12).translate(0, 0, 70)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-ring", (cylinder(16, 65, 12).translate(0, 0, 164)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-glass", (cylinder(5, 54, 12).translate(0, 0, 180)).translate(0, 0, 0).scale(scale).color(color));
p.part("aperture-band", (cylinder(18, 56, 12).translate(0, 0, 35)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
