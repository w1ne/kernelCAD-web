// Original kernelCAD low-poly ventilated fish crate with raised corner blocks, drainage slots and two hand openings.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "fish-crate",
  license: 'CC0-1.0',
  title: "Fish crate",
  description: "Ventilated fish crate with raised corner blocks, drainage slots and two hand openings. Knobs: overall scale and asset color.",
  tags: ["fish crate", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#637057", { label: 'Asset color' });
const p = assembly("fish-crate");
p.part("base", (box(520, 350, 30, true).translate(0, 0, 15)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("long-side-front", (box(520, 26, 185, true).translate(0, -162, 120)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("long-side-back", (box(520, 26, 185, true).translate(0, 162, 120)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("end-left", (box(26, 300, 185, true).translate(-247, 0, 120)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("end-right", (box(26, 300, 185, true).translate(247, 0, 120)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("rim-front", (box(540, 34, 30, true).translate(0, -162, 222)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("rim-back", (box(540, 34, 30, true).translate(0, 162, 222)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("corner-left", (box(34, 34, 225, true).translate(-247, -162, 112)).translate(0, 0, 0.5).scale(scale).color(color));
p.part("corner-right", (box(34, 34, 225, true).translate(247, 162, 112)).translate(0, 0, 0.5).scale(scale).color(color));

return p.model();
