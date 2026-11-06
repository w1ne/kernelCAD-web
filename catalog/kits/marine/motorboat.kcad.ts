// Motorboat: A pointed hull supports a cockpit console, glazed screen, paired seats, and motor mount. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "motorboat",
  license: 'CC0-1.0',
  title: "Motorboat",
  description: "Motorboat: A pointed hull supports a cockpit console, glazed screen, paired seats, and motor mount. Low-poly visualization prop. Material controls: painted hull coating, nonskid deck coating, marine glass, stainless steel.",
  tags: ["motorboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedHull = param('paintedHull', '#4b6572', { label: 'Painted hull coating' });
const nonskidCoating = param('nonskidCoating', '#46575a', { label: 'Nonskid deck coating' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { paintedHull: '#56676c', nonskidCoating: '#535d5a', marineGlass: '#5b9aaa', stainlessSteel: '#a9b1af' },
  highVisibility: { paintedHull: '#e56b38' },
});
const p = assembly("motorboat");
p.part("hull", (extrudePolygon([[-650, 0], [-420, 310], [360, 300], [570, 180], [650, 0], [570, -180], [360, -300], [-420, -310]], 130).translate(0, 0, 28)).translate(0, 0, -28).scale(scale).color(paintedHull));
p.part("deck", (box(980, 520, 38, true).translate(-10, 0, 165)).translate(0, 0, -28).scale(scale).color(nonskidCoating));
p.part("console", (box(250, 230, 310, true).translate(-120, 0, 330)).translate(0, 0, -28).scale(scale).color(paintedHull));
p.part("windshield", (box(290, 18, 122, true).rotate([0, 1, 0], -12).translate(-120, -128, 524)).translate(0, 0, -28).scale(scale).color(marineGlass));
p.part("seat-front", (box(250, 140, 90, true).translate(165, 0, 230)).translate(0, 0, -28).scale(scale).color(paintedHull));
p.part("seat-rear", (box(300, 160, 94, true).translate(-390, 0, 235)).translate(0, 0, -28).scale(scale).color(paintedHull));
p.part("motor-mount", (box(180, 145, 52, true).translate(-620, 0, 160)).translate(0, 0, -28).scale(scale).color(stainlessSteel));

return p.model();
