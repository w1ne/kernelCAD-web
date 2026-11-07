// Bait bucket: A tapered bait tub has a fitted lid, rim, wire handles, and a grip. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "bait-bucket",
  license: 'CC0-1.0',
  title: "Bait bucket",
  description: "Bait bucket: A tapered bait tub has a fitted lid, rim, wire handles, and a grip. Low-poly visualization prop. Material controls: marine polymer, stainless steel, rubber.",
  tags: ["bait bucket", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const marinePolymer = param('marinePolymer', '#53606a', { label: 'Marine polymer' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { marinePolymer: '#5c6466', stainlessSteel: '#a9b1af', rubber: '#434542' },
  highVisibility: { marinePolymer: '#eda338' },
});
const p = assembly("bait-bucket");
p.part("tub", (cylinder(330, 150, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(marinePolymer));
p.part("base-band", (cylinder(30, 140, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(marinePolymer));
p.part("rim", (cylinder(26, 158, 12).translate(0, 0, 316)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("lid", (cylinder(22, 145, 12).translate(0, 0, 338)).translate(0, 0, 0).scale(scale).color(marinePolymer));
p.part("handle-left", (box(18, 24, 190, true).rotate([0, 1, 0], -25).translate(-125, 0, 396)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("handle-right", (box(18, 24, 190, true).rotate([0, 1, 0], 25).translate(125, 0, 396)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("handle-grip", (cylinder(270, 14, 8).rotate([0, 1, 0], 90).translate(-135, 0, 488)).translate(0, 0, 0).scale(scale).color(rubber));

return p.model();
