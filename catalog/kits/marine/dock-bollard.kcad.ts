// Dock bollard: A flared foot and capped column support two opposing mooring horns. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "dock-bollard",
  license: 'CC0-1.0',
  title: "Dock bollard",
  description: "Dock bollard: A flared foot and capped column support two opposing mooring horns. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["dock bollard", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#4d5357', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#585a58', stainlessSteel: '#a9b1af' },
  highVisibility: { paintedSteel: '#e39032' },
});
const p = assembly("dock-bollard");
p.part("foot", (cylinder(34, 110, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(paintedSteel));
p.part("column", (cylinder(168, 56, 10).translate(0, 0, 30)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("cap", (cylinder(50, 74, 10).translate(0, 0, 180)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("horn-left", (cylinder(176, 30, 10).rotate([0, 1, 0], 90).translate(-53, 0, 220)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("horn-right", (cylinder(176, 30, 10).rotate([0, 1, 0], 90).translate(53, 0, 220)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
