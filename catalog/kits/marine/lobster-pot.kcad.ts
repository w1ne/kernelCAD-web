// Lobster pot: A tapered pot frame has opposed entry funnels and a top handle. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "lobster-pot",
  license: 'CC0-1.0',
  title: "Lobster pot",
  description: "Lobster pot: A tapered pot frame has opposed entry funnels and a top handle. Low-poly visualization prop. Material controls: timber, nylon netting, stainless steel.",
  tags: ["lobster pot", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#8b6340', { label: 'Timber' });
const nylonNetting = param('nylonNetting', '#73674f', { label: 'Nylon netting' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { timber: '#856648', nylonNetting: '#736952', stainlessSteel: '#a9b1af' },
  highVisibility: { timber: '#a87b3e' },
});
const p = assembly("lobster-pot");
p.part("base", (box(600, 420, 36, true).translate(0, 0, 18)).translate(0, 0, 0).scale(scale).color(timber));
p.part("top", (box(600, 420, 32, true).translate(0, 0, 360)).translate(0, 0, 0).scale(scale).color(timber));
p.part("post-left-front", (box(32, 32, 360, true).translate(-284, -194, 198)).translate(0, 0, 0).scale(scale).color(timber));
p.part("post-right-front", (box(32, 32, 360, true).translate(284, -194, 198)).translate(0, 0, 0).scale(scale).color(timber));
p.part("post-left-back", (box(32, 32, 360, true).translate(-284, 194, 198)).translate(0, 0, 0).scale(scale).color(timber));
p.part("post-right-back", (box(32, 32, 360, true).translate(284, 194, 198)).translate(0, 0, 0).scale(scale).color(timber));
p.part("entry-funnel-left", (cylinder(180, 105, 10).rotate([1, 0, 0], 90).translate(0, -202, 218)).translate(0, 0, 0).scale(scale).color(nylonNetting));
p.part("entry-funnel-right", (cylinder(180, 105, 10).rotate([1, 0, 0], 90).translate(0, 202, 218)).translate(0, 0, 0).scale(scale).color(nylonNetting));
p.part("handle", (box(120, 30, 80, true).translate(0, 0, 414)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
