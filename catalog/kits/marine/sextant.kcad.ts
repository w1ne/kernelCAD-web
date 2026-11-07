// Original kernelCAD low-poly marine sextant with a framed arc, index arm, horizon mirror and small sighting telescope.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "sextant",
  license: 'CC0-1.0',
  title: "Sextant",
  description: "Marine sextant with a framed arc, index arm, horizon mirror and small sighting telescope. Knobs: overall scale and asset color.",
  tags: ["sextant", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#a18b5d", { label: 'Asset color' });
const p = assembly("sextant");
p.part("arc", (cylinder(18, 170, 18).subtract(cylinder(20, 133, 18).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 182)).translate(0, 0, 14).scale(scale).color(color));
p.part("frame-left", (box(24, 24, 194, true).rotate([0, 1, 0], -32).translate(-62, 0, 125)).translate(0, 0, 14).scale(scale).color(color));
p.part("frame-right", (box(24, 24, 194, true).rotate([0, 1, 0], 32).translate(62, 0, 125)).translate(0, 0, 14).scale(scale).color(color));
p.part("index-arm", (box(20, 20, 250, true).rotate([0, 1, 0], 37).translate(46, 0, 164)).translate(0, 0, 14).scale(scale).color(color));
p.part("telescope", (cylinder(200, 20, 10).rotate([0, 1, 0], 90).translate(18, 0, 282)).translate(0, 0, 14).scale(scale).color(color));
p.part("eyepiece", (cylinder(40, 30, 10).rotate([0, 1, 0], 90).translate(-10, 0, 282)).translate(0, 0, 14).scale(scale).color(color));
p.part("handle", (box(46, 74, 120, true).translate(0, 35, 46)).translate(0, 0, 14).scale(scale).color(color));

return p.model();
