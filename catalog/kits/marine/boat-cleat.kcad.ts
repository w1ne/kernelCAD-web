// Original kernelCAD low-poly low deck cleat with a raised center bridge, flared horns and two mounting feet.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "boat-cleat",
  license: 'CC0-1.0',
  title: "Boat cleat",
  description: "Low deck cleat with a raised center bridge, flared horns and two mounting feet. Knobs: overall scale and asset color.",
  tags: ["boat cleat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#777d80", { label: 'Asset color' });
const p = assembly("boat-cleat");
p.part("base-plate", (box(190, 86, 20, true).translate(0, 0, 18)).translate(0, 0, 0).scale(scale).color(color));
p.part("bridge", (box(48, 60, 76, true).translate(0, 0, 63)).translate(0, 0, 0).scale(scale).color(color));
p.part("horn-left", (cylinder(132, 20, 10).rotate([0, 1, 0], 90).translate(-36, 0, 110)).translate(0, 0, 0).scale(scale).color(color));
p.part("horn-right", (cylinder(132, 20, 10).rotate([0, 1, 0], 90).translate(36, 0, 110)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount-left", (cylinder(22, 15, 8).translate(-70, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount-right", (cylinder(22, 15, 8).translate(70, 0, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
