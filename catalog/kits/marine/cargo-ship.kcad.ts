// Cargo ship: A faceted hull carries six container blocks behind a raised bridge. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "cargo-ship",
  license: 'CC0-1.0',
  title: "Cargo ship",
  description: "Cargo ship: A faceted hull carries six container blocks behind a raised bridge. Low-poly visualization prop. Material controls: painted hull coating, nonskid deck coating, stainless steel, cargo container coating.",
  tags: ["cargo ship", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedHull = param('paintedHull', '#4c5b60', { label: 'Painted hull coating' });
const nonskidCoating = param('nonskidCoating', '#46575a', { label: 'Nonskid deck coating' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const cargoCoating = param('cargoCoating', '#b4563e', { label: 'Cargo container coating' });
presets({
  weathered: { paintedHull: '#57605f', nonskidCoating: '#535d5a', stainlessSteel: '#a9b1af', cargoCoating: '#a25c46' },
  highVisibility: { paintedHull: '#e56b38' },
});
const p = assembly("cargo-ship");
p.part("hull", (extrudePolygon([[-1000, 0], [-760, 350], [780, 350], [980, 210], [1020, 0], [980, -210], [780, -350], [-760, -350]], 250).translate(0, 0, 45)).translate(0, 0, -45).scale(scale).color(paintedHull));
p.part("deck", (box(1780, 660, 48, true).translate(-5, 0, 292)).translate(0, 0, -45).scale(scale).color(nonskidCoating));
p.part("bridge", (box(280, 360, 560, true).translate(-730, 0, 598)).translate(0, 0, -45).scale(scale).color(paintedHull));
p.part("bridge-top", (box(310, 400, 44, true).translate(-730, 0, 900)).translate(0, 0, -45).scale(scale).color(stainlessSteel));
p.part("container-1", (box(320, 260, 250, true).translate(-300, -170, 442)).translate(0, 0, -45).scale(scale).color(cargoCoating));
p.part("container-2", (box(320, 260, 250, true).translate(55, -170, 442)).translate(0, 0, -45).scale(scale).color(cargoCoating));
p.part("container-3", (box(320, 260, 250, true).translate(410, -170, 442)).translate(0, 0, -45).scale(scale).color(cargoCoating));
p.part("container-4", (box(320, 260, 250, true).translate(-300, 170, 442)).translate(0, 0, -45).scale(scale).color(cargoCoating));
p.part("container-5", (box(320, 260, 250, true).translate(55, 170, 442)).translate(0, 0, -45).scale(scale).color(cargoCoating));
p.part("container-6", (box(320, 260, 250, true).translate(410, 170, 442)).translate(0, 0, -45).scale(scale).color(cargoCoating));

return p.model();
