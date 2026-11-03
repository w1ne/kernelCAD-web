// Original kernelCAD low-poly open motorboat with a pointed planing hull, wraparound bow rail, windshield and rear outboard mount.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "motorboat",
  license: 'CC0-1.0',
  title: "Motorboat",
  description: "Open motorboat with a pointed planing hull, wraparound bow rail, windshield and rear outboard mount. Knobs: overall scale and asset color.",
  tags: ["motorboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4b6572", { label: 'Asset color' });
const p = assembly("motorboat");
p.part("hull", (extrudePolygon([[-650, 0], [-420, 310], [360, 300], [570, 180], [650, 0], [570, -180], [360, -300], [-420, -310]], 130).translate(0, 0, 28)).translate(0, 0, -28).scale(scale).color(color));
p.part("deck", (box(980, 520, 38, true).translate(-10, 0, 165)).translate(0, 0, -28).scale(scale).color(color));
p.part("console", (box(250, 230, 310, true).translate(-120, 0, 330)).translate(0, 0, -28).scale(scale).color(color));
p.part("windshield", (box(290, 18, 122, true).rotate([0, 1, 0], -12).translate(-120, -128, 524)).translate(0, 0, -28).scale(scale).color(color));
p.part("seat-front", (box(250, 140, 90, true).translate(165, 0, 230)).translate(0, 0, -28).scale(scale).color(color));
p.part("seat-rear", (box(300, 160, 94, true).translate(-390, 0, 235)).translate(0, 0, -28).scale(scale).color(color));
p.part("motor-mount", (box(180, 145, 52, true).translate(-620, 0, 160)).translate(0, 0, -28).scale(scale).color(color));

return p.model();
