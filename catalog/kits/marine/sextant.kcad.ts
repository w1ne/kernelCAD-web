// Sextant: A graduated arc and index arm frame a telescope above a hand grip. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "sextant",
  license: 'CC0-1.0',
  title: "Sextant",
  description: "Sextant: A graduated arc and index arm frame a telescope above a hand grip. Low-poly visualization prop. Material controls: brass, stainless steel, marine glass, timber.",
  tags: ["sextant", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const brass = param('brass', '#a18b5d', { label: 'Brass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const timber = param('timber', '#805d3d', { label: 'Timber' });
presets({
  weathered: { brass: '#94835c', stainlessSteel: '#a9b1af', marineGlass: '#5b9aaa', timber: '#7d6145' },
  highVisibility: { brass: '#d1a448' },
});
const p = assembly("sextant");
p.part("arc", (cylinder(18, 170, 18).subtract(cylinder(20, 133, 18).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 182)).translate(0, 0, 14).scale(scale).color(brass));
p.part("frame-left", (box(24, 24, 194, true).rotate([0, 1, 0], -32).translate(-62, 0, 125)).translate(0, 0, 14).scale(scale).color(brass));
p.part("frame-right", (box(24, 24, 194, true).rotate([0, 1, 0], 32).translate(62, 0, 125)).translate(0, 0, 14).scale(scale).color(brass));
p.part("index-arm", (box(20, 20, 250, true).rotate([0, 1, 0], 37).translate(46, 0, 164)).translate(0, 0, 14).scale(scale).color(stainlessSteel));
p.part("telescope", (cylinder(200, 20, 10).rotate([0, 1, 0], 90).translate(18, 0, 282)).translate(0, 0, 14).scale(scale).color(marineGlass));
p.part("eyepiece", (cylinder(40, 30, 10).rotate([0, 1, 0], 90).translate(-10, 0, 282)).translate(0, 0, 14).scale(scale).color(marineGlass));
p.part("handle", (box(46, 74, 120, true).translate(0, 35, 46)).translate(0, 0, 14).scale(scale).color(timber));

return p.model();
