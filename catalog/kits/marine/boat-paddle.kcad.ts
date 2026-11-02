// Original kernelCAD low-poly single-blade canoe paddle with a wide leaf-shaped blade, straight shaft and T-grip.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "boat-paddle",
  license: 'CC0-1.0',
  title: "Boat paddle",
  description: "Single-blade canoe paddle with a wide leaf-shaped blade, straight shaft and T-grip. Knobs: overall scale and asset color.",
  tags: ["boat paddle", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#75583d", { label: 'Asset color' });
const p = assembly("boat-paddle");
p.part("shaft", (cylinder(1180, 20, 8).translate(0, 0, 210)).translate(0, 0, -34).scale(scale).color(color));
p.part("blade", (sphere(138).scale([0.6, 0.14, 1.2]).translate(0, 0, 1420)).translate(0, 0, -34).scale(scale).color(color));
p.part("blade-neck", (box(50, 30, 220, true).translate(0, 0, 1240)).translate(0, 0, -34).scale(scale).color(color));
p.part("t-grip", (box(190, 42, 52, true).translate(0, 0, 60)).translate(0, 0, -34).scale(scale).color(color));

return p.model();
