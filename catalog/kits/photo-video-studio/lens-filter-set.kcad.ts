// Original kernelCAD low-poly stack of three circular photographic filters with stepped rims and a compact storage case.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "lens-filter-set",
  license: 'CC0-1.0',
  title: "Lens filter set",
  description: "Stack of three circular photographic filters with stepped rims and a compact storage case. Knobs: overall scale and asset color.",
  tags: ["lens filter set", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6e767c", { label: 'Asset color' });
const p = assembly("lens-filter-set");
p.part("filter-one", (cylinder(8, 78, 16)).translate(0, 0, 0).scale(scale).color(color));
p.part("filter-one-rim", (cylinder(8, 84, 16).translate(0, 0, 8)).translate(0, 0, 0).scale(scale).color(color));
p.part("filter-two", (cylinder(8, 72, 16).translate(190, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("filter-two-rim", (cylinder(8, 78, 16).translate(190, 0, 8)).translate(0, 0, 0).scale(scale).color(color));
p.part("filter-three", (cylinder(8, 66, 16).translate(-190, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("filter-three-rim", (cylinder(8, 72, 16).translate(-190, 0, 8)).translate(0, 0, 0).scale(scale).color(color));
p.part("case", (box(440, 116, 30, true).translate(0, 150, 15)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
