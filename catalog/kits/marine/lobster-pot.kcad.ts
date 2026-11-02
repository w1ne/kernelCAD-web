// Original kernelCAD low-poly rectangular lobster pot with a weighted base, frame rails, mesh panels and inward entry funnels.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "lobster-pot",
  license: 'CC0-1.0',
  title: "Lobster pot",
  description: "Rectangular lobster pot with a weighted base, frame rails, mesh panels and inward entry funnels. Knobs: overall scale and asset color.",
  tags: ["lobster pot", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#8b6340", { label: 'Asset color' });
const p = assembly("lobster-pot");
p.part("base", (box(600, 420, 36, true).translate(0, 0, 18)).translate(0, 0, 0).scale(scale).color(color));
p.part("top", (box(600, 420, 32, true).translate(0, 0, 360)).translate(0, 0, 0).scale(scale).color(color));
p.part("post-left-front", (box(32, 32, 360, true).translate(-284, -194, 198)).translate(0, 0, 0).scale(scale).color(color));
p.part("post-right-front", (box(32, 32, 360, true).translate(284, -194, 198)).translate(0, 0, 0).scale(scale).color(color));
p.part("post-left-back", (box(32, 32, 360, true).translate(-284, 194, 198)).translate(0, 0, 0).scale(scale).color(color));
p.part("post-right-back", (box(32, 32, 360, true).translate(284, 194, 198)).translate(0, 0, 0).scale(scale).color(color));
p.part("entry-funnel-left", (cylinder(180, 105, 10).rotate([1, 0, 0], 90).translate(0, -202, 218)).translate(0, 0, 0).scale(scale).color(color));
p.part("entry-funnel-right", (cylinder(180, 105, 10).rotate([1, 0, 0], 90).translate(0, 202, 218)).translate(0, 0, 0).scale(scale).color(color));
p.part("handle", (box(120, 30, 80, true).translate(0, 0, 414)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
