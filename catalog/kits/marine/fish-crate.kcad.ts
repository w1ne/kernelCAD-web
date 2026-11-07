// Fish crate: An open slatted crate has a solid base, perimeter rim, and corner plates. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "fish-crate",
  license: 'CC0-1.0',
  title: "Fish crate",
  description: "Fish crate: An open slatted crate has a solid base, perimeter rim, and corner plates. Low-poly visualization prop. Material controls: timber, stainless steel.",
  tags: ["fish crate", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#637057', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { timber: '#686f58', stainlessSteel: '#a9b1af' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("fish-crate");
p.part("base", (box(520, 350, 30, true).translate(0, 0, 15)).translate(0, 0, 0.5).scale(scale).color(timber));
p.part("long-side-front", (box(520, 26, 185, true).translate(0, -162, 120)).translate(0, 0, 0.5).scale(scale).color(timber));
p.part("long-side-back", (box(520, 26, 185, true).translate(0, 162, 120)).translate(0, 0, 0.5).scale(scale).color(timber));
p.part("end-left", (box(26, 300, 185, true).translate(-247, 0, 120)).translate(0, 0, 0.5).scale(scale).color(timber));
p.part("end-right", (box(26, 300, 185, true).translate(247, 0, 120)).translate(0, 0, 0.5).scale(scale).color(timber));
p.part("rim-front", (box(540, 34, 30, true).translate(0, -162, 222)).translate(0, 0, 0.5).scale(scale).color(stainlessSteel));
p.part("rim-back", (box(540, 34, 30, true).translate(0, 162, 222)).translate(0, 0, 0.5).scale(scale).color(stainlessSteel));
p.part("corner-left", (box(34, 34, 225, true).translate(-247, -162, 112)).translate(0, 0, 0.5).scale(scale).color(stainlessSteel));
p.part("corner-right", (box(34, 34, 225, true).translate(247, 162, 112)).translate(0, 0, 0.5).scale(scale).color(stainlessSteel));

return p.model();
