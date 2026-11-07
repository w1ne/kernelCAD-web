// Motor yacht: A long white hull carries two cabin levels, a dark window band, swim platform, and bow rail. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "yacht",
  license: 'CC0-1.0',
  title: "Motor yacht",
  description: "Motor yacht: A long white hull carries two cabin levels, a dark window band, swim platform, and bow rail. Low-poly visualization prop. Material controls: painted fiberglass, nonskid deck coating, marine glass, stainless steel.",
  tags: ["yacht", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedFiberglass = param('paintedFiberglass', '#e2e0d4', { label: 'Painted fiberglass' });
const nonskidCoating = param('nonskidCoating', '#46575a', { label: 'Nonskid deck coating' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { paintedFiberglass: '#c3c0b2', nonskidCoating: '#535d5a', marineGlass: '#5b9aaa', stainlessSteel: '#a9b1af' },
  highVisibility: { paintedFiberglass: '#e59b35' },
});
const p = assembly("yacht");
p.part("hull", (extrudePolygon([[-780, 0], [-540, 290], [430, 280], [700, 170], [760, 0], [700, -170], [430, -280], [-540, -290]], 175).translate(0, 0, 35)).translate(0, 0, -35).scale(scale).color(paintedFiberglass));
p.part("deck", (box(1250, 490, 40, true).translate(-5, 0, 212)).translate(0, 0, -35).scale(scale).color(nonskidCoating));
p.part("lower-cabin", (box(500, 350, 260, true).translate(-205, 0, 362)).translate(0, 0, -35).scale(scale).color(paintedFiberglass));
p.part("upper-cabin", (box(380, 300, 180, true).translate(-150, 0, 582)).translate(0, 0, -35).scale(scale).color(paintedFiberglass));
p.part("window-band", (box(450, 16, 86, true).translate(-190, -178, 393)).translate(0, 0, -35).scale(scale).color(marineGlass));
p.part("roof", (box(440, 350, 40, true).translate(-150, 0, 692)).translate(0, 0, -35).scale(scale).color(paintedFiberglass));
p.part("swim-platform", (box(230, 380, 42, true).translate(-700, 0, 180)).translate(0, 0, -35).scale(scale).color(nonskidCoating));
p.part("bow-rail", (box(180, 32, 22, true).translate(560, 0, 300)).translate(0, 0, -35).scale(scale).color(stainlessSteel));

return p.model();
