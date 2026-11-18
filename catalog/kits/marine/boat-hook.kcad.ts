// Boat hook: A long pole ends in a guarded hook with a crossbar and ferrule. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "boat-hook",
  license: 'CC0-1.0',
  title: "Boat hook",
  description: "Boat hook: A long pole ends in a guarded hook with a crossbar and ferrule. Low-poly visualization prop. Material controls: timber, stainless steel, safety amber lens.",
  tags: ["boat hook", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#6b6250', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const safetyAmber = param('safetyAmber', '#f2b536', { label: 'Safety amber lens' });
presets({
  weathered: { timber: '#6e6553', stainlessSteel: '#a9b1af', safetyAmber: '#cfa140' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("boat-hook");
p.part("shaft", (cylinder(1450, 18, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(timber));
p.part("collar", (cylinder(34, 27, 8).translate(0, 0, 1260)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("hook-spine", (box(28, 30, 190, true).rotate([0, 1, 0], -20).translate(0, 0, 1490)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("hook-tip", (sphere(25).translate(-34, 0, 1570)).translate(0, 0, 0).scale(scale).color(safetyAmber));
p.part("crossbar", (box(176, 30, 34, true).translate(0, 0, 1370)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
