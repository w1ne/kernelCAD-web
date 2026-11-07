// Original kernelCAD low-poly open camera cage with top handle, side rails, accessory shoe and a wide quick-release base.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "camera-cage",
  license: 'CC0-1.0',
  title: "Camera cage",
  description: "Open camera cage with top handle, side rails, accessory shoe and a wide quick-release base. Knobs: overall scale and asset color.",
  tags: ["camera cage", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#454b50", { label: 'Asset color' });
const p = assembly("camera-cage");
p.part("base-plate", (box(220, 176, 24, true).translate(0, 0, 55)).translate(0, 0, -43).scale(scale).color(color));
p.part("camera-body", (box(148, 94, 116, true).translate(0, 0, 160)).translate(0, 0, -43).scale(scale).color(color));
p.part("left-rail", (box(20, 22, 300, true).translate(-112, 0, 196)).translate(0, 0, -43).scale(scale).color(color));
p.part("right-rail", (box(20, 22, 300, true).translate(112, 0, 196)).translate(0, 0, -43).scale(scale).color(color));
p.part("top-rail", (box(244, 26, 22, true).translate(0, 0, 336)).translate(0, 0, -43).scale(scale).color(color));
p.part("top-handle", (box(138, 44, 26, true).translate(0, 0, 374)).translate(0, 0, -43).scale(scale).color(color));
p.part("shoe-mount", (box(44, 30, 18, true).translate(0, 0, 360)).translate(0, 0, -43).scale(scale).color(color));
p.part("left-grip", (box(36, 82, 110, true).translate(-156, 0, 195)).translate(0, 0, -43).scale(scale).color(color));
p.part("right-grip", (box(36, 82, 110, true).translate(156, 0, 195)).translate(0, 0, -43).scale(scale).color(color));

return p.model();
