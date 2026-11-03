// Original kernelCAD low-poly open inflatable life raft with four buoyant side tubes, floor panel and corner grab lines.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "inflatable-life-raft",
  license: 'CC0-1.0',
  title: "Inflatable life raft",
  description: "Open inflatable life raft with four buoyant side tubes, floor panel and corner grab lines. Knobs: overall scale and asset color.",
  tags: ["inflatable life raft", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#d4b24e", { label: 'Asset color' });
const p = assembly("inflatable-life-raft");
p.part("floor", (box(620, 480, 45, true).translate(0, 0, 72)).translate(0, 0, -49.5).scale(scale).color(color));
p.part("rail-front", (cylinder(720, 82, 12).rotate([0, 1, 0], 90).translate(-360, -240, 145)).translate(0, 0, -49.5).scale(scale).color(color));
p.part("rail-back", (cylinder(720, 82, 12).rotate([0, 1, 0], 90).translate(-360, 240, 145)).translate(0, 0, -49.5).scale(scale).color(color));
p.part("rail-left", (cylinder(480, 82, 12).rotate([1, 0, 0], 90).translate(-360, 240, 145)).translate(0, 0, -49.5).scale(scale).color(color));
p.part("rail-right", (cylinder(480, 82, 12).rotate([1, 0, 0], 90).translate(360, 240, 145)).translate(0, 0, -49.5).scale(scale).color(color));
p.part("canopy-pole", (cylinder(420, 18, 8).translate(0, 0, 170)).translate(0, 0, -49.5).scale(scale).color(color));
p.part("canopy", (box(430, 20, 20, true).translate(0, 0, 570)).translate(0, 0, -49.5).scale(scale).color(color));

return p.model();
