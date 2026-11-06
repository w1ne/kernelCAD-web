// Boat paddle: A long shaft carries a wide blade, reinforced neck, and T-grip. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "boat-paddle",
  license: 'CC0-1.0',
  title: "Boat paddle",
  description: "Boat paddle: A long shaft carries a wide blade, reinforced neck, and T-grip. Low-poly visualization prop. Material controls: timber, stainless steel, rubber.",
  tags: ["boat paddle", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#75583d', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { timber: '#755e45', stainlessSteel: '#a9b1af', rubber: '#434542' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("boat-paddle");
p.part("shaft", (cylinder(1180, 20, 8).translate(0, 0, 210)).translate(0, 0, -34).scale(scale).color(timber));
p.part("blade", (sphere(138).scale([0.6, 0.14, 1.2]).translate(0, 0, 1420)).translate(0, 0, -34).scale(scale).color(timber));
p.part("blade-neck", (box(50, 30, 220, true).translate(0, 0, 1240)).translate(0, 0, -34).scale(scale).color(stainlessSteel));
p.part("t-grip", (box(190, 42, 52, true).translate(0, 0, 60)).translate(0, 0, -34).scale(scale).color(rubber));

return p.model();
