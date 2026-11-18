// Boat oar: A tapered shaft connects a broad blade, hand grip, and collar. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "boat-oar",
  license: 'CC0-1.0',
  title: "Boat oar",
  description: "Boat oar: A tapered shaft connects a broad blade, hand grip, and collar. Low-poly visualization prop. Material controls: timber, rubber, stainless steel.",
  tags: ["boat oar", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#805d3d', { label: 'Timber' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { timber: '#7d6145', rubber: '#434542', stainlessSteel: '#a9b1af' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("boat-oar");
p.part("shaft", (cylinder(1450, 20, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(timber));
p.part("blade", (box(155, 32, 280, true).rotate([0, 1, 0], -7).translate(0, 0, 1510)).translate(0, 0, 0).scale(scale).color(timber));
p.part("grip", (cylinder(180, 25, 8).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("collar", (cylinder(28, 34, 8).translate(0, 0, 1160)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
