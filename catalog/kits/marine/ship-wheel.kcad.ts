// Ship wheel: A circular rim surrounds a hub with radial spokes and projecting handles. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "ship-wheel",
  license: 'CC0-1.0',
  title: "Ship wheel",
  description: "Ship wheel: A circular rim surrounds a hub with radial spokes and projecting handles. Low-poly visualization prop. Material controls: timber, brass.",
  tags: ["ship wheel", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#72553a', { label: 'Timber' });
const brass = param('brass', '#c29b45', { label: 'Brass' });
presets({
  weathered: { timber: '#735c43', brass: '#ac8e4b' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("ship-wheel");
p.part("rim", (cylinder(28, 235, 20).subtract(cylinder(30, 198, 20).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 270)).translate(0, 0, -35).scale(scale).color(timber));
p.part("hub", (cylinder(72, 56, 12).rotate([1, 0, 0], 90).translate(0, 0, 270)).translate(0, 0, -35).scale(scale).color(brass));
p.part("spoke-1", (box(22, 28, 420, true).translate(0, 0, 270)).translate(0, 0, -35).scale(scale).color(timber));
p.part("spoke-2", (box(22, 28, 420, true).rotate([0, 1, 0], 45).translate(0, 0, 270)).translate(0, 0, -35).scale(scale).color(timber));
p.part("spoke-3", (box(22, 28, 420, true).rotate([0, 1, 0], -45).translate(0, 0, 270)).translate(0, 0, -35).scale(scale).color(timber));
p.part("handle-top", (cylinder(76, 16, 8).translate(0, 0, 490)).translate(0, 0, -35).scale(scale).color(brass));
p.part("handle-left", (cylinder(76, 16, 8).rotate([0, 1, 0], 90).translate(-220, 0, 270)).translate(0, 0, -35).scale(scale).color(brass));
p.part("handle-right", (cylinder(76, 16, 8).rotate([0, 1, 0], 90).translate(220, 0, 270)).translate(0, 0, -35).scale(scale).color(brass));

return p.model();
