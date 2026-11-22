// Ship horn: A trumpet body flares to a broad mouth above a supported mounting base. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "ship-horn",
  license: 'CC0-1.0',
  title: "Ship horn",
  description: "Ship horn: A trumpet body flares to a broad mouth above a supported mounting base. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["ship horn", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#5d6468', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#636764', stainlessSteel: '#a9b1af' },
  highVisibility: { paintedSteel: '#e39032' },
});
const p = assembly("ship-horn");
p.part("trumpet-body", (cylinder(320, 38, 12).rotate([0, 1, 0], 90).translate(0, 0, 260)).translate(0, 0, 0).scale(scale).color(paintedSteel));
p.part("mouth", (cylinder(90, 112, 12).subtract(cylinder(92, 82, 12).translate(0, 0, -1)).rotate([0, 1, 0], 90).translate(300, 0, 260)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("rear-cap", (cylinder(34, 44, 10).rotate([0, 1, 0], 90).translate(-30, 0, 260)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("mount-base", (box(400, 140, 24, true).translate(145, 0, 12)).translate(0, 0, 0).scale(scale).color(paintedSteel));
p.part("support-left", (box(34, 48, 240, true).translate(40, 0, 126)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("support-right", (box(34, 48, 240, true).translate(270, 0, 126)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
