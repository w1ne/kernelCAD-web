// Fishing boat: A faceted working hull carries a wheelhouse, glazed front, mast, and bow and stern rails. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "fishing-boat",
  license: 'CC0-1.0',
  title: "Fishing boat",
  description: "Fishing boat: A faceted working hull carries a wheelhouse, glazed front, mast, and bow and stern rails. Low-poly visualization prop. Material controls: painted hull coating, nonskid deck coating, marine glass, stainless steel.",
  tags: ["fishing boat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedHull = param('paintedHull', '#465a62', { label: 'Painted hull coating' });
const nonskidCoating = param('nonskidCoating', '#46575a', { label: 'Nonskid deck coating' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { paintedHull: '#535f60', nonskidCoating: '#535d5a', marineGlass: '#5b9aaa', stainlessSteel: '#a9b1af' },
  highVisibility: { paintedHull: '#e56b38' },
});
const p = assembly("fishing-boat");
p.part("hull", (extrudePolygon([[-760, 0], [-520, 300], [400, 300], [680, 180], [720, 0], [680, -180], [400, -300], [-520, -300]], 190).translate(0, 0, 30)).translate(0, 0, -30).scale(scale).color(paintedHull));
p.part("deck", (box(1150, 510, 45, true).translate(-30, 0, 244)).translate(0, 0, -30).scale(scale).color(nonskidCoating));
p.part("wheelhouse", (box(430, 390, 370, true).translate(-220, 0, 450)).translate(0, 0, -30).scale(scale).color(paintedHull));
p.part("front-window", (box(250, 14, 120, true).translate(-25, -198, 480)).translate(0, 0, -30).scale(scale).color(marineGlass));
p.part("roof", (box(510, 470, 48, true).translate(-220, 0, 660)).translate(0, 0, -30).scale(scale).color(paintedHull));
p.part("mast", (cylinder(440, 14, 8).translate(-220, 0, 684)).translate(0, 0, -30).scale(scale).color(paintedHull));
p.part("stern-rail", (box(180, 560, 28, true).translate(-620, 0, 394)).translate(0, 0, -30).scale(scale).color(stainlessSteel));
p.part("bow-rail", (box(170, 42, 28, true).translate(520, 0, 394)).translate(0, 0, -30).scale(scale).color(stainlessSteel));

return p.model();
