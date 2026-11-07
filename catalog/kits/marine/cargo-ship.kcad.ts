// Original kernelCAD low-poly low-poly coastal cargo ship with a long hull, bridge, cargo deck and stacked container blocks.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "cargo-ship",
  license: 'CC0-1.0',
  title: "Cargo ship",
  description: "Low-poly coastal cargo ship with a long hull, bridge, cargo deck and stacked container blocks. Knobs: overall scale and asset color.",
  tags: ["cargo ship", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4c5b60", { label: 'Asset color' });
const p = assembly("cargo-ship");
p.part("hull", (extrudePolygon([[-1000, 0], [-760, 350], [780, 350], [980, 210], [1020, 0], [980, -210], [780, -350], [-760, -350]], 250).translate(0, 0, 45)).translate(0, 0, -45).scale(scale).color(color));
p.part("deck", (box(1780, 660, 48, true).translate(-5, 0, 292)).translate(0, 0, -45).scale(scale).color(color));
p.part("bridge", (box(280, 360, 560, true).translate(-730, 0, 598)).translate(0, 0, -45).scale(scale).color(color));
p.part("bridge-top", (box(310, 400, 44, true).translate(-730, 0, 900)).translate(0, 0, -45).scale(scale).color(color));
p.part("container-1", (box(320, 260, 250, true).translate(-300, -170, 442)).translate(0, 0, -45).scale(scale).color(color));
p.part("container-2", (box(320, 260, 250, true).translate(55, -170, 442)).translate(0, 0, -45).scale(scale).color(color));
p.part("container-3", (box(320, 260, 250, true).translate(410, -170, 442)).translate(0, 0, -45).scale(scale).color(color));
p.part("container-4", (box(320, 260, 250, true).translate(-300, 170, 442)).translate(0, 0, -45).scale(scale).color(color));
p.part("container-5", (box(320, 260, 250, true).translate(55, 170, 442)).translate(0, 0, -45).scale(scale).color(color));
p.part("container-6", (box(320, 260, 250, true).translate(410, 170, 442)).translate(0, 0, -45).scale(scale).color(color));

return p.model();
