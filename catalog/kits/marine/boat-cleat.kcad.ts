// Boat cleat: Two raised horns bridge a deck plate with paired mounting feet. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "boat-cleat",
  license: 'CC0-1.0',
  title: "Boat cleat",
  description: "Boat cleat: Two raised horns bridge a deck plate with paired mounting feet. Low-poly visualization prop. Material controls: stainless steel, brass.",
  tags: ["boat cleat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const brass = param('brass', '#c29b45', { label: 'Brass' });
presets({
  weathered: { stainlessSteel: '#a9b1af', brass: '#ac8e4b' },
  highVisibility: { stainlessSteel: '#d7a342' },
});
const p = assembly("boat-cleat");
p.part("base-plate", (box(190, 86, 20, true).translate(0, 0, 18)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("bridge", (box(48, 60, 76, true).translate(0, 0, 63)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("horn-left", (cylinder(132, 20, 10).rotate([0, 1, 0], 90).translate(-36, 0, 110)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("horn-right", (cylinder(132, 20, 10).rotate([0, 1, 0], 90).translate(36, 0, 110)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("mount-left", (cylinder(22, 15, 8).translate(-70, 0, 0)).translate(0, 0, 0).scale(scale).color(brass));
p.part("mount-right", (cylinder(22, 15, 8).translate(70, 0, 0)).translate(0, 0, 0).scale(scale).color(brass));

return p.model();
