// Ship porthole: A glazed round opening is held by a thick frame and four mounting lugs. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "porthole",
  license: 'CC0-1.0',
  title: "Ship porthole",
  description: "Ship porthole: A glazed round opening is held by a thick frame and four mounting lugs. Low-poly visualization prop. Material controls: brass, marine glass, stainless steel.",
  tags: ["porthole", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const brass = param('brass', '#8a744a', { label: 'Brass' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { brass: '#84724f', marineGlass: '#5b9aaa', stainlessSteel: '#a9b1af' },
  highVisibility: { brass: '#d1a448' },
});
const p = assembly("porthole");
p.part("frame", (cylinder(36, 180, 16).subtract(cylinder(38, 132, 16).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 190)).translate(0, 0, 8).scale(scale).color(brass));
p.part("inner-glass", (cylinder(12, 129, 16).rotate([1, 0, 0], 90).translate(0, -26, 190)).translate(0, 0, 8).scale(scale).color(marineGlass));
p.part("lug-top", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(0, -15, 362)).translate(0, 0, 8).scale(scale).color(stainlessSteel));
p.part("lug-bottom", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(0, -15, 18)).translate(0, 0, 8).scale(scale).color(stainlessSteel));
p.part("lug-left", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(-172, -15, 190)).translate(0, 0, 8).scale(scale).color(stainlessSteel));
p.part("lug-right", (cylinder(30, 26, 10).rotate([1, 0, 0], 90).translate(172, -15, 190)).translate(0, 0, 8).scale(scale).color(stainlessSteel));

return p.model();
