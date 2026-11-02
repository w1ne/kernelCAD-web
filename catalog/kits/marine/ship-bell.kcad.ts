// Original kernelCAD low-poly ship bell with a flared bell body, crown loop, clapper and compact overhead bracket.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "ship-bell",
  license: 'CC0-1.0',
  title: "Ship bell",
  description: "Ship bell with a flared bell body, crown loop, clapper and compact overhead bracket. Knobs: overall scale and asset color.",
  tags: ["ship bell", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#887447", { label: 'Asset color' });
const p = assembly("ship-bell");
p.part("bell", (sphere(95).scale([1, 1, 0.82]).translate(0, 0, 132)).translate(0, 0, 0).scale(scale).color(color));
p.part("skirt", (cylinder(32, 94, 12).translate(0, 0, 46)).translate(0, 0, 0).scale(scale).color(color));
p.part("stem", (cylinder(82, 24, 10).translate(0, 0, 194)).translate(0, 0, 0).scale(scale).color(color));
p.part("crown", (cylinder(40, 36, 10).translate(0, 0, 266)).translate(0, 0, 0).scale(scale).color(color));
p.part("loop", (cylinder(20, 44, 10).subtract(cylinder(22, 24, 10).translate(0, 0, -1)).translate(0, 0, 292)).translate(0, 0, 0).scale(scale).color(color));
p.part("clapper", (cylinder(76, 13, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
