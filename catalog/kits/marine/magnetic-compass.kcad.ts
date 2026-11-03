// Original kernelCAD low-poly handheld marine magnetic compass with a circular housing, raised bezel and direction card.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "magnetic-compass",
  license: 'CC0-1.0',
  title: "Marine magnetic compass",
  description: "Handheld marine magnetic compass with a circular housing, raised bezel and direction card. Knobs: overall scale and asset color.",
  tags: ["magnetic compass", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#ba9b51", { label: 'Asset color' });
const p = assembly("magnetic-compass");
p.part("housing", (cylinder(62, 122, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("bezel", (cylinder(24, 130, 12).translate(0, 0, 58)).translate(0, 0, 0).scale(scale).color(color));
p.part("card", (cylinder(8, 103, 16).translate(0, 0, 80)).translate(0, 0, 0).scale(scale).color(color));
p.part("lubber-line", (box(14, 12, 45, true).translate(0, -118, 88)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount-ear-left", (box(50, 42, 30, true).translate(-142, 0, 30)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount-ear-right", (box(50, 42, 30, true).translate(142, 0, 30)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
