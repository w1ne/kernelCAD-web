// Binnacle compass: A raised compass bowl and hood sit above a tapered pedestal and mounting feet. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "binnacle-compass",
  license: 'CC0-1.0',
  title: "Binnacle compass",
  description: "Binnacle compass: A raised compass bowl and hood sit above a tapered pedestal and mounting feet. Low-poly visualization prop. Material controls: timber, brass, marine glass, stainless steel.",
  tags: ["binnacle compass", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#6b5940', { label: 'Timber' });
const brass = param('brass', '#c29b45', { label: 'Brass' });
const marineGlass = param('marineGlass', '#55a4bb', { label: 'Marine glass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { timber: '#6e5f48', brass: '#ac8e4b', marineGlass: '#5b9aaa', stainlessSteel: '#a9b1af' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("binnacle-compass");
p.part("base", (cylinder(45, 140, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(timber));
p.part("pedestal", (cylinder(320, 78, 10).translate(0, 0, 34)).translate(0, 0, 0).scale(scale).color(timber));
p.part("shoulder", (cylinder(44, 118, 12).translate(0, 0, 340)).translate(0, 0, 0).scale(scale).color(brass));
p.part("compass-bowl", (cylinder(130, 130, 12).translate(0, 0, 380)).translate(0, 0, 0).scale(scale).color(brass));
p.part("hood", (sphere(138).scale([1, 1, 0.46]).translate(0, 0, 520)).translate(0, 0, 0).scale(scale).color(marineGlass));
p.part("mount-left", (box(92, 75, 36, true).translate(-166, 0, 18)).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("mount-right", (box(92, 75, 36, true).translate(166, 0, 18)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
