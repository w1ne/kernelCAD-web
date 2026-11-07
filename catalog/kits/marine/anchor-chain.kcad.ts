// Anchor chain: Articulated chain links lead to a terminal shackle. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "anchor-chain",
  license: 'CC0-1.0',
  title: "Anchor chain",
  description: "Anchor chain: Articulated chain links lead to a terminal shackle. Low-poly visualization prop. Material controls: galvanized steel, stainless steel.",
  tags: ["anchor chain", "marine", "nautical", "harbor", "low poly", "CC0"],
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
const p = assembly("anchor-chain");
p.part("link-1", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 44)).translate(0, 0, -2).scale(scale).color(galvanizedSteel));
p.part("link-2", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).rotate([0, 0, 1], 90).translate(0, 0, 112)).translate(0, 0, -2).scale(scale).color(galvanizedSteel));
p.part("link-3", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 180)).translate(0, 0, -2).scale(scale).color(galvanizedSteel));
p.part("link-4", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).rotate([0, 0, 1], 90).translate(0, 0, 248)).translate(0, 0, -2).scale(scale).color(galvanizedSteel));
p.part("link-5", (cylinder(20, 42, 12).subtract(cylinder(22, 25, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 316)).translate(0, 0, -2).scale(scale).color(galvanizedSteel));
p.part("terminal-shackle", (cylinder(26, 36, 10).rotate([1, 0, 0], 90).translate(0, 0, 384)).translate(0, 0, -2).scale(scale).color(stainlessSteel));

return p.model();
