// Harbor tugboat: A low working hull carries a raised bridge, paired stacks, front glazing, and bow fender. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "tugboat",
  license: 'CC0-1.0',
  title: "Harbor tugboat",
  description: "Harbor tugboat: A low working hull carries a raised bridge, paired stacks, front glazing, and bow fender. Low-poly visualization prop. Material controls: painted hull coating, nonskid deck coating, marine glass, rubber.",
  tags: ["tugboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedHull = param('paintedHull', '#3f5965', { label: 'Painted hull coating' });
const nonskidCoating = param('nonskidCoating', '#46575a', { label: 'Nonskid deck coating' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { paintedHull: '#4e5f62', nonskidCoating: '#535d5a', marineGlass: '#5b9aaa', rubber: '#434542' },
  highVisibility: { paintedHull: '#e56b38' },
});
const p = assembly("tugboat");
p.part("hull", (extrudePolygon([[-610, 0], [-430, 275], [370, 275], [560, 145], [610, 0], [560, -145], [370, -275], [-430, -275]], 180).translate(0, 0, 35)).translate(0, 0, -35).scale(scale).color(paintedHull));
p.part("deck", (box(950, 470, 42, true).translate(-10, 0, 218)).translate(0, 0, -35).scale(scale).color(nonskidCoating));
p.part("cabin", (box(390, 340, 360, true).translate(-130, 0, 418)).translate(0, 0, -35).scale(scale).color(paintedHull));
p.part("bridge", (box(430, 390, 130, true).translate(-130, 0, 646)).translate(0, 0, -35).scale(scale).color(paintedHull));
p.part("front-glass", (box(300, 12, 90, true).translate(91, -173, 670)).translate(0, 0, -35).scale(scale).color(marineGlass));
p.part("stack-one", (cylinder(180, 38, 10).translate(-240, -85, 780)).translate(0, 0, -35).scale(scale).color(paintedHull));
p.part("stack-two", (cylinder(180, 38, 10).translate(-240, 85, 780)).translate(0, 0, -35).scale(scale).color(paintedHull));
p.part("bow-fender", (sphere(92).scale([0.7, 1.25, 0.55]).translate(570, 0, 220)).translate(0, 0, -35).scale(scale).color(rubber));

return p.model();
