// Marine anchor: A long shank, cross-stock, ring, and splayed flukes form the holding profile. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "anchor",
  license: 'CC0-1.0',
  title: "Marine anchor",
  description: "Marine anchor: A long shank, cross-stock, ring, and splayed flukes form the holding profile. Low-poly visualization prop. Material controls: galvanized steel, stainless steel.",
  tags: ["anchor", "marine", "nautical", "harbor", "low poly", "CC0"],
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
const p = assembly("anchor");
p.part("shank", (box(42, 48, 520, true).translate(0, 0, 280)).translate(0, 0, 44.714).scale(scale).color(galvanizedSteel));
p.part("stock", (box(300, 46, 44, true).translate(0, 0, 470)).translate(0, 0, 44.714).scale(scale).color(galvanizedSteel));
p.part("crown", (sphere(55).translate(0, 0, 65)).translate(0, 0, 44.714).scale(scale).color(galvanizedSteel));
p.part("fluke-left", (box(46, 70, 230, true).rotate([0, 1, 0], -32).translate(-94, 0, 65)).translate(0, 0, 44.714).scale(scale).color(galvanizedSteel));
p.part("fluke-right", (box(46, 70, 230, true).rotate([0, 1, 0], 32).translate(94, 0, 65)).translate(0, 0, 44.714).scale(scale).color(galvanizedSteel));
p.part("ring", (cylinder(32, 44, 10).rotate([1, 0, 0], 90).translate(0, 0, 558)).translate(0, 0, 44.714).scale(scale).color(stainlessSteel));

return p.model();
