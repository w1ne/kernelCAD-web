// Dock ladder: Two tall side rails carry evenly spaced horizontal rungs. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "dock-ladder",
  license: 'CC0-1.0',
  title: "Dock ladder",
  description: "Dock ladder: Two tall side rails carry evenly spaced horizontal rungs. Low-poly visualization prop. Material controls: galvanized steel, stainless steel.",
  tags: ["dock ladder", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#929fa2', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#8a918e', stainlessSteel: '#a9b1af' },
  highVisibility: { galvanizedSteel: '#d9a13a' },
});
const p = assembly("dock-ladder");
p.part("rail-left", (cylinder(1100, 30, 10).translate(-170, 0, 0)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("rail-right", (cylinder(1100, 30, 10).translate(170, 0, 0)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("rung-1", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 170)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("rung-2", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 360)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("rung-3", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 550)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("rung-4", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 740)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("rung-5", (cylinder(400, 24, 10).rotate([0, 1, 0], 90).translate(-200, 0, 930)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
