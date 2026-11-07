// Original kernelCAD low-poly heavy timber dock piling with tapered cap, waterline collar and a broad base shoe.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "dock-piling",
  license: 'CC0-1.0',
  title: "Dock piling",
  description: "Heavy timber dock piling with tapered cap, waterline collar and a broad base shoe. Knobs: overall scale and asset color.",
  tags: ["dock piling", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#70533a", { label: 'Asset color' });
const p = assembly("dock-piling");
p.part("pile", (cylinder(1300, 115, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("cap", (box(280, 280, 90, true).translate(0, 0, 1280)).translate(0, 0, 0).scale(scale).color(color));
p.part("collar", (cylinder(90, 137, 10).translate(0, 0, 360)).translate(0, 0, 0).scale(scale).color(color));
p.part("base-shoe", (cylinder(38, 132, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
