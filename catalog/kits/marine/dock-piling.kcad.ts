// Dock piling: A timber pile has a protective cap, collar, and base shoe. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "dock-piling",
  license: 'CC0-1.0',
  title: "Dock piling",
  description: "Dock piling: A timber pile has a protective cap, collar, and base shoe. Low-poly visualization prop. Material controls: timber, galvanized steel.",
  tags: ["dock piling", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#70533a', { label: 'Timber' });
const galvanizedSteel = param('galvanizedSteel', '#929fa2', { label: 'Galvanized steel' });
presets({
  weathered: { timber: '#715a43', galvanizedSteel: '#8a918e' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("dock-piling");
p.part("pile", (cylinder(1300, 115, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(timber));
p.part("cap", (box(280, 280, 90, true).translate(0, 0, 1280)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("collar", (cylinder(90, 137, 10).translate(0, 0, 360)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("base-shoe", (cylinder(38, 132, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));

return p.model();
