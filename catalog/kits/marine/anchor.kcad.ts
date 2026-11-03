// Original kernelCAD low-poly stockless marine anchor with a long shank, transverse stock, broad flukes and crown.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "anchor",
  license: 'CC0-1.0',
  title: "Marine anchor",
  description: "Stockless marine anchor with a long shank, transverse stock, broad flukes and crown. Knobs: overall scale and asset color.",
  tags: ["anchor", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4a5054", { label: 'Asset color' });
const p = assembly("anchor");
p.part("shank", (box(42, 48, 520, true).translate(0, 0, 280)).translate(0, 0, 44.714).scale(scale).color(color));
p.part("stock", (box(300, 46, 44, true).translate(0, 0, 470)).translate(0, 0, 44.714).scale(scale).color(color));
p.part("crown", (sphere(55).translate(0, 0, 65)).translate(0, 0, 44.714).scale(scale).color(color));
p.part("fluke-left", (box(46, 70, 230, true).rotate([0, 1, 0], -32).translate(-94, 0, 65)).translate(0, 0, 44.714).scale(scale).color(color));
p.part("fluke-right", (box(46, 70, 230, true).rotate([0, 1, 0], 32).translate(94, 0, 65)).translate(0, 0, 44.714).scale(scale).color(color));
p.part("ring", (cylinder(32, 44, 10).rotate([1, 0, 0], 90).translate(0, 0, 558)).translate(0, 0, 44.714).scale(scale).color(color));

return p.model();
