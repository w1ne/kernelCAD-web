// Original kernelCAD low-poly marine bait bucket with tapered-looking tub, bail handle, lid and side grip.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "bait-bucket",
  license: 'CC0-1.0',
  title: "Bait bucket",
  description: "Marine bait bucket with tapered-looking tub, bail handle, lid and side grip. Knobs: overall scale and asset color.",
  tags: ["bait bucket", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#53606a", { label: 'Asset color' });
const p = assembly("bait-bucket");
p.part("tub", (cylinder(330, 150, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("base-band", (cylinder(30, 140, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("rim", (cylinder(26, 158, 12).translate(0, 0, 316)).translate(0, 0, 0).scale(scale).color(color));
p.part("lid", (cylinder(22, 145, 12).translate(0, 0, 338)).translate(0, 0, 0).scale(scale).color(color));
p.part("handle-left", (box(18, 24, 190, true).rotate([0, 1, 0], -25).translate(-125, 0, 396)).translate(0, 0, 0).scale(scale).color(color));
p.part("handle-right", (box(18, 24, 190, true).rotate([0, 1, 0], 25).translate(125, 0, 396)).translate(0, 0, 0).scale(scale).color(color));
p.part("handle-grip", (cylinder(270, 14, 8).rotate([0, 1, 0], 90).translate(-135, 0, 488)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
