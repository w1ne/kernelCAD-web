// Sailboat: A narrow hull carries a mast, boom, triangular sail, and open cockpit. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "sailboat",
  license: 'CC0-1.0',
  title: "Sailboat",
  description: "Sailboat: A narrow hull carries a mast, boom, triangular sail, and open cockpit. Low-poly visualization prop. Material controls: painted hull coating, nonskid deck coating, timber, canvas.",
  tags: ["sailboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedHull = param('paintedHull', '#7a5840', { label: 'Painted hull coating' });
const nonskidCoating = param('nonskidCoating', '#46575a', { label: 'Nonskid deck coating' });
const timber = param('timber', '#805d3d', { label: 'Timber' });
const canvas = param('canvas', '#ddd0a6', { label: 'Canvas' });
presets({
  weathered: { paintedHull: '#785e48', nonskidCoating: '#535d5a', timber: '#7d6145', canvas: '#c0b491' },
  highVisibility: { paintedHull: '#e56b38' },
});
const p = assembly("sailboat");
p.part("hull", (extrudePolygon([[-650, 0], [-420, 230], [350, 220], [570, 120], [640, 0], [570, -120], [350, -220], [-420, -230]], 110).translate(0, 0, 28)).translate(0, 0, -28).scale(scale).color(paintedHull));
p.part("deck", (box(950, 390, 35, true).translate(-25, 0, 146)).translate(0, 0, -28).scale(scale).color(nonskidCoating));
p.part("mast", (cylinder(1040, 17, 8).translate(40, 0, 160)).translate(0, 0, -28).scale(scale).color(timber));
p.part("boom", (cylinder(590, 14, 8).rotate([0, 1, 0], 90).translate(40, 0, 445)).translate(0, 0, -28).scale(scale).color(timber));
p.part("main-sail", (box(420, 18, 570, true).rotate([0, 1, 0], 28).translate(260, 0, 600)).translate(0, 0, -28).scale(scale).color(canvas));
p.part("cockpit", (box(260, 170, 90, true).translate(-220, 0, 195)).translate(0, 0, -28).scale(scale).color(paintedHull));
p.part("seat", (box(235, 40, 32, true).translate(-220, 0, 250)).translate(0, 0, -28).scale(scale).color(paintedHull));

return p.model();
