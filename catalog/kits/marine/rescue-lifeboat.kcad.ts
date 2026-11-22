// Rescue lifeboat: A deep rescue hull carries a raised cabin, glazed windows, and roof beacon. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "rescue-lifeboat",
  license: 'CC0-1.0',
  title: "Rescue lifeboat",
  description: "Rescue lifeboat: A deep rescue hull carries a raised cabin, glazed windows, and roof beacon. Low-poly visualization prop. Material controls: safety vinyl, nonskid deck coating, marine glass, safety amber lens.",
  tags: ["rescue lifeboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyVinyl = param('safetyVinyl', '#e45c3a', { label: 'Safety vinyl' });
const nonskidCoating = param('nonskidCoating', '#46575a', { label: 'Nonskid deck coating' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const safetyAmber = param('safetyAmber', '#f2b536', { label: 'Safety amber lens' });
presets({
  weathered: { safetyVinyl: '#c56143', nonskidCoating: '#535d5a', marineGlass: '#5b9aaa', safetyAmber: '#cfa140' },
  highVisibility: { safetyVinyl: '#f17935' },
});
const p = assembly("rescue-lifeboat");
p.part("hull", (extrudePolygon([[-720, 0], [-500, 250], [370, 250], [620, 120], [680, 0], [620, -120], [370, -250], [-500, -250]], 160).translate(0, 0, 35)).translate(0, 0, -35).scale(scale).color(safetyVinyl));
p.part("deck", (box(1020, 420, 42, true).translate(-20, 0, 215)).translate(0, 0, -35).scale(scale).color(nonskidCoating));
p.part("cabin", (box(470, 300, 260, true).translate(-130, 0, 360)).translate(0, 0, -35).scale(scale).color(safetyVinyl));
p.part("front-window", (box(270, 12, 96, true).translate(45, -154, 418)).translate(0, 0, -35).scale(scale).color(marineGlass));
p.part("side-window", (box(12, 168, 82, true).translate(-371, -5, 420)).translate(0, 0, -35).scale(scale).color(marineGlass));
p.part("roof", (box(540, 344, 48, true).translate(-130, 0, 514)).translate(0, 0, -35).scale(scale).color(safetyVinyl));
p.part("beacon", (cylinder(72, 33, 10).translate(-130, 0, 572)).translate(0, 0, -35).scale(scale).color(safetyAmber));

return p.model();
