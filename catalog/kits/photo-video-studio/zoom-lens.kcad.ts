// Original kernelCAD low-poly general-purpose zoom lens with multiple telescoping barrel diameters and two raised control rings.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "zoom-lens",
  license: 'CC0-1.0',
  title: "Zoom lens",
  description: "General-purpose zoom lens with multiple telescoping barrel diameters and two raised control rings. Knobs: overall scale and asset color.",
  tags: ["zoom lens", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#444b50", { label: 'Asset color' });
const p = assembly("zoom-lens");
p.part("mount", (cylinder(18, 55, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("rear-barrel", (cylinder(65, 50, 12).translate(0, 0, 18)).translate(0, 0, 0).scale(scale).color(color));
p.part("zoom-ring", (cylinder(38, 61, 12).translate(0, 0, 68)).translate(0, 0, 0).scale(scale).color(color));
p.part("middle-barrel", (cylinder(88, 53, 12).translate(0, 0, 103)).translate(0, 0, 0).scale(scale).color(color));
p.part("focus-ring", (cylinder(30, 62, 12).translate(0, 0, 188)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-barrel", (cylinder(45, 55, 12).translate(0, 0, 215)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-rim", (cylinder(14, 66, 12).translate(0, 0, 256)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-glass", (cylinder(6, 53, 12).translate(0, 0, 270)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
