// Crab trap: A ribbed trap frame surrounds a bait cage and lifting handle. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "crab-trap",
  license: 'CC0-1.0',
  title: "Crab trap",
  description: "Crab trap: A ribbed trap frame surrounds a bait cage and lifting handle. Low-poly visualization prop. Material controls: galvanized steel, nylon netting, rope fiber.",
  tags: ["crab trap", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#929fa2', { label: 'Galvanized steel' });
const nylonNetting = param('nylonNetting', '#73674f', { label: 'Nylon netting' });
const ropeFiber = param('ropeFiber', '#a78a5d', { label: 'Rope fiber' });
presets({
  weathered: { galvanizedSteel: '#8a918e', nylonNetting: '#736952', ropeFiber: '#99825c' },
  highVisibility: { galvanizedSteel: '#d9a13a' },
});
const p = assembly("crab-trap");
p.part("base-ring", (cylinder(28, 245, 16).subtract(cylinder(30, 202, 16).translate(0, 0, -1)).translate(0, 0, 16)).translate(0, 0, -16).scale(scale).color(galvanizedSteel));
p.part("top-ring", (cylinder(26, 245, 16).subtract(cylinder(28, 202, 16).translate(0, 0, -1)).translate(0, 0, 300)).translate(0, 0, -16).scale(scale).color(galvanizedSteel));
p.part("rib-1", (box(24, 24, 300, true).translate(-220, 0, 178)).translate(0, 0, -16).scale(scale).color(galvanizedSteel));
p.part("rib-2", (box(24, 24, 300, true).translate(220, 0, 178)).translate(0, 0, -16).scale(scale).color(galvanizedSteel));
p.part("rib-3", (box(24, 24, 300, true).translate(0, -220, 178)).translate(0, 0, -16).scale(scale).color(galvanizedSteel));
p.part("rib-4", (box(24, 24, 300, true).translate(0, 220, 178)).translate(0, 0, -16).scale(scale).color(galvanizedSteel));
p.part("bait-cage", (box(130, 130, 155, true).translate(0, 0, 178)).translate(0, 0, -16).scale(scale).color(nylonNetting));
p.part("handle", (box(34, 34, 130, true).translate(0, 0, 366)).translate(0, 0, -16).scale(scale).color(ropeFiber));

return p.model();
