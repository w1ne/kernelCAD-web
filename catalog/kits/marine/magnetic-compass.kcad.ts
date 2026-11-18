// Marine magnetic compass: A marked compass card sits inside a bezel with a lubber line and mounting ears. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "magnetic-compass",
  license: 'CC0-1.0',
  title: "Marine magnetic compass",
  description: "Marine magnetic compass: A marked compass card sits inside a bezel with a lubber line and mounting ears. Low-poly visualization prop. Material controls: brass, stainless steel, printed paper card, safety amber lens.",
  tags: ["magnetic compass", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const brass = param('brass', '#ba9b51', { label: 'Brass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const paperCard = param('paperCard', '#e9dda7', { label: 'Printed paper card' });
const safetyAmber = param('safetyAmber', '#f2b536', { label: 'Safety amber lens' });
presets({
  weathered: { brass: '#a68e54', stainlessSteel: '#a9b1af', paperCard: '#c8be92', safetyAmber: '#cfa140' },
  highVisibility: { brass: '#d1a448' },
});
const p = assembly("magnetic-compass");
p.part("housing", (cylinder(62, 122, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(brass));
p.part("bezel", (cylinder(24, 130, 12).translate(0, 0, 58)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("card", (cylinder(8, 103, 16).translate(0, 0, 80)).translate(0, 0, 0).scale(scale).color(paperCard));
p.part("lubber-line", (box(14, 12, 45, true).translate(0, -118, 88)).translate(0, 0, 0).scale(scale).color(safetyAmber));
p.part("mount-ear-left", (box(50, 42, 30, true).translate(-142, 0, 30)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("mount-ear-right", (box(50, 42, 30, true).translate(142, 0, 30)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
