// Original kernelCAD low-poly tall channel marker buoy with a flared float, mast, top daymark and weighted foot.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "channel-marker-buoy",
  license: 'CC0-1.0',
  title: "Channel marker buoy",
  description: "Tall channel marker buoy with a flared float, mast, top daymark and weighted foot. Knobs: overall scale and asset color.",
  tags: ["channel marker buoy", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#df4f39", { label: 'Asset color' });
const p = assembly("channel-marker-buoy");
p.part("float", (cylinder(290, 145, 10).translate(0, 0, 90)).translate(0, 0, 0).scale(scale).color(color));
p.part("float-cap", (cylinder(40, 158, 10).translate(0, 0, 350)).translate(0, 0, 0).scale(scale).color(color));
p.part("mast", (cylinder(670, 18, 8).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(color));
p.part("daymark", (box(190, 45, 150, true).translate(0, 0, 920)).translate(0, 0, 0).scale(scale).color(color));
p.part("top-ball", (sphere(45).translate(0, 0, 1030)).translate(0, 0, 0).scale(scale).color(color));
p.part("keel-weight", (cylinder(100, 70, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
