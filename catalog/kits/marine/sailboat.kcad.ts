// Original kernelCAD low-poly small daysailer with a pointed hull, centerboard, mast, triangular mainsail and cockpit bench.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "sailboat",
  license: 'CC0-1.0',
  title: "Sailboat",
  description: "Small daysailer with a pointed hull, centerboard, mast, triangular mainsail and cockpit bench. Knobs: overall scale and asset color.",
  tags: ["sailboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7a5840", { label: 'Asset color' });
const p = assembly("sailboat");
p.part("hull", (extrudePolygon([[-650, 0], [-420, 230], [350, 220], [570, 120], [640, 0], [570, -120], [350, -220], [-420, -230]], 110).translate(0, 0, 28)).translate(0, 0, -28).scale(scale).color(color));
p.part("deck", (box(950, 390, 35, true).translate(-25, 0, 146)).translate(0, 0, -28).scale(scale).color(color));
p.part("mast", (cylinder(1040, 17, 8).translate(40, 0, 160)).translate(0, 0, -28).scale(scale).color(color));
p.part("boom", (cylinder(590, 14, 8).rotate([0, 1, 0], 90).translate(40, 0, 445)).translate(0, 0, -28).scale(scale).color(color));
p.part("main-sail", (box(420, 18, 570, true).rotate([0, 1, 0], 28).translate(260, 0, 600)).translate(0, 0, -28).scale(scale).color(color));
p.part("cockpit", (box(260, 170, 90, true).translate(-220, 0, 195)).translate(0, 0, -28).scale(scale).color(color));
p.part("seat", (box(235, 40, 32, true).translate(-220, 0, 250)).translate(0, 0, -28).scale(scale).color(color));

return p.model();
