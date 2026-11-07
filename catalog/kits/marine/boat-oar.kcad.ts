// Original kernelCAD low-poly single wooden boat oar with a long tapered-looking shaft, broad blade and hand grip.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "boat-oar",
  license: 'CC0-1.0',
  title: "Boat oar",
  description: "Single wooden boat oar with a long tapered-looking shaft, broad blade and hand grip. Knobs: overall scale and asset color.",
  tags: ["boat oar", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#805d3d", { label: 'Asset color' });
const p = assembly("boat-oar");
p.part("shaft", (cylinder(1450, 20, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("blade", (box(155, 32, 280, true).rotate([0, 1, 0], -7).translate(0, 0, 1510)).translate(0, 0, 0).scale(scale).color(color));
p.part("grip", (cylinder(180, 25, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("collar", (cylinder(28, 34, 8).translate(0, 0, 1160)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
