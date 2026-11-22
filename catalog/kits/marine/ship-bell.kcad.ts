// Ship bell: A flared bell hangs from a crown and loop around a visible clapper. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "ship-bell",
  license: 'CC0-1.0',
  title: "Ship bell",
  description: "Ship bell: A flared bell hangs from a crown and loop around a visible clapper. Low-poly visualization prop. Material controls: bronze, brass, stainless steel.",
  tags: ["ship bell", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const bronze = param('bronze', '#887447', { label: 'Bronze' });
const brass = param('brass', '#c29b45', { label: 'Brass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { bronze: '#82724d', brass: '#ac8e4b', stainlessSteel: '#a9b1af' },
  highVisibility: { bronze: '#bd8a3d' },
});
const p = assembly("ship-bell");
p.part("bell", (sphere(95).scale([1, 1, 0.82]).translate(0, 0, 132)).translate(0, 0, 0).scale(scale).color(bronze));
p.part("skirt", (cylinder(32, 94, 12).translate(0, 0, 46)).translate(0, 0, 0).scale(scale).color(bronze));
p.part("stem", (cylinder(82, 24, 10).translate(0, 0, 194)).translate(0, 0, 0).scale(scale).color(brass));
p.part("crown", (cylinder(40, 36, 10).translate(0, 0, 266)).translate(0, 0, 0).scale(scale).color(brass));
p.part("loop", (cylinder(20, 44, 10).subtract(cylinder(22, 24, 10).translate(0, 0, -1)).translate(0, 0, 292)).translate(0, 0, 0).scale(scale).color(brass));
p.part("clapper", (cylinder(76, 13, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
