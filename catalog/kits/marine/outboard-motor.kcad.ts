// Outboard motor: A cowled powerhead narrows through a leg to a skeg and three-blade propeller. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "outboard-motor",
  license: 'CC0-1.0',
  title: "Outboard motor",
  description: "Outboard motor: A cowled powerhead narrows through a leg to a skeg and three-blade propeller. Low-poly visualization prop. Material controls: painted aluminum, stainless steel, bronze, rubber.",
  tags: ["outboard motor", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedAluminum = param('paintedAluminum', '#50565a', { label: 'Painted aluminum' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const bronze = param('bronze', '#a97b3b', { label: 'Bronze' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { paintedAluminum: '#5a5c5a', stainlessSteel: '#a9b1af', bronze: '#9a7744', rubber: '#434542' },
  highVisibility: { paintedAluminum: '#e29435' },
});
const p = assembly("outboard-motor");
p.part("powerhead", (box(230, 180, 260, true).translate(0, 0, 585)).translate(0, 0, 35).scale(scale).color(paintedAluminum));
p.part("top-cover", (sphere(125).scale([1, 0.75, 0.9]).translate(0, 0, 728)).translate(0, 0, 35).scale(scale).color(paintedAluminum));
p.part("midsection", (box(110, 100, 350, true).translate(0, 0, 275)).translate(0, 0, 35).scale(scale).color(stainlessSteel));
p.part("gearcase", (sphere(75).scale([0.8, 1, 1.2]).translate(0, 0, 83)).translate(0, 0, 35).scale(scale).color(stainlessSteel));
p.part("skeg", (box(36, 90, 140, true).translate(0, 0, 35)).translate(0, 0, 35).scale(scale).color(stainlessSteel));
p.part("prop-shaft", (cylinder(110, 20, 8).rotate([1, 0, 0], 90).translate(0, -45, 80)).translate(0, 0, 35).scale(scale).color(stainlessSteel));
p.part("prop-blade-1", (box(24, 210, 44, true).rotate([0, 0, 1], 25).translate(0, -148, 80)).translate(0, 0, 35).scale(scale).color(bronze));
p.part("prop-blade-2", (box(24, 210, 44, true).rotate([0, 0, 1], 145).translate(0, -148, 80)).translate(0, 0, 35).scale(scale).color(bronze));
p.part("tiller", (cylinder(320, 18, 8).rotate([0, 1, 0], 90).translate(130, 0, 700)).translate(0, 0, 35).scale(scale).color(rubber));
p.part("clamp", (box(190, 145, 38, true).translate(0, 0, 412)).translate(0, 0, 35).scale(scale).color(stainlessSteel));

return p.model();
