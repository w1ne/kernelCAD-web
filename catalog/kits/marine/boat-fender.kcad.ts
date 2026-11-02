// Original kernelCAD low-poly inflatable boat fender with rounded body, end eyes and a rope-through center opening.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "boat-fender",
  license: 'CC0-1.0',
  title: "Boat fender",
  description: "Inflatable boat fender with rounded body, end eyes and a rope-through center opening. Knobs: overall scale and asset color.",
  tags: ["boat fender", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#53616a", { label: 'Asset color' });
const p = assembly("boat-fender");
p.part("body", (sphere(110).scale([0.62, 0.62, 1.4]).translate(0, 0, 160)).translate(0, 0, -6).scale(scale).color(color));
p.part("top-eye", (cylinder(38, 30, 10).subtract(cylinder(40, 16, 10).translate(0, 0, -1)).translate(0, 0, 296)).translate(0, 0, -6).scale(scale).color(color));
p.part("bottom-eye", (cylinder(38, 30, 10).subtract(cylinder(40, 16, 10).translate(0, 0, -1)).translate(0, 0, 8)).translate(0, 0, -6).scale(scale).color(color));
p.part("cap-top", (cylinder(16, 42, 10).translate(0, 0, 280)).translate(0, 0, -6).scale(scale).color(color));
p.part("cap-bottom", (cylinder(16, 42, 10).translate(0, 0, 24)).translate(0, 0, -6).scale(scale).color(color));

return p.model();
