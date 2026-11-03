// Original kernelCAD low-poly sealed marine life-raft canister with two shell halves, locking bands and deck cradles.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "life-raft-canister",
  license: 'CC0-1.0',
  title: "Life raft canister",
  description: "Sealed marine life-raft canister with two shell halves, locking bands and deck cradles. Knobs: overall scale and asset color.",
  tags: ["life raft canister", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#d6a849", { label: 'Asset color' });
const p = assembly("life-raft-canister");
p.part("shell", (cylinder(520, 114, 12).rotate([0, 1, 0], 90).translate(-260, 0, 150)).translate(0, 0, 0).scale(scale).color(color));
p.part("end-left", (sphere(114).translate(-260, 0, 150)).translate(0, 0, 0).scale(scale).color(color));
p.part("end-right", (sphere(114).translate(260, 0, 150)).translate(0, 0, 0).scale(scale).color(color));
p.part("strap-left", (box(30, 240, 240, true).translate(-170, 0, 150)).translate(0, 0, 0).scale(scale).color(color));
p.part("strap-right", (box(30, 240, 240, true).translate(170, 0, 150)).translate(0, 0, 0).scale(scale).color(color));
p.part("cradle-left", (box(650, 46, 30, true).translate(0, -92, 15)).translate(0, 0, 0).scale(scale).color(color));
p.part("cradle-right", (box(650, 46, 30, true).translate(0, 92, 15)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
