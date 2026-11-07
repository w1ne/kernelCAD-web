// Original kernelCAD low-poly floating mooring buoy with broad body, top lifting eye and heavy chain attachment below.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "mooring-buoy",
  license: 'CC0-1.0',
  title: "Mooring buoy",
  description: "Floating mooring buoy with broad body, top lifting eye and heavy chain attachment below. Knobs: overall scale and asset color.",
  tags: ["mooring buoy", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#c7503d", { label: 'Asset color' });
const p = assembly("mooring-buoy");
p.part("float-body", (sphere(180).scale([1, 1, 0.82]).translate(0, 0, 230)).translate(0, 0, 0).scale(scale).color(color));
p.part("top-cap", (cylinder(44, 90, 12).translate(0, 0, 356)).translate(0, 0, 0).scale(scale).color(color));
p.part("lifting-eye", (cylinder(34, 50, 12).subtract(cylinder(36, 28, 12).translate(0, 0, -1)).translate(0, 0, 398)).translate(0, 0, 0).scale(scale).color(color));
p.part("chain-shackle", (cylinder(54, 33, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
