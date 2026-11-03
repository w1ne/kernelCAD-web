// Original kernelCAD low-poly long telephoto zoom lens with a tripod collar, broad hood rim and stepped focus bands.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "telephoto-lens",
  license: 'CC0-1.0',
  title: "Telephoto lens",
  description: "Long telephoto zoom lens with a tripod collar, broad hood rim and stepped focus bands. Knobs: overall scale and asset color.",
  tags: ["telephoto lens", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#343a3f", { label: 'Asset color' });
const p = assembly("telephoto-lens");
p.part("main-barrel", (cylinder(260, 48, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount", (cylinder(24, 58, 12)).translate(0, 0, 0).scale(scale).color(color));
p.part("zoom-band", (cylinder(60, 59, 12).translate(0, 0, 54)).translate(0, 0, 0).scale(scale).color(color));
p.part("focus-band", (cylinder(42, 56, 12).translate(0, 0, 180)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-rim", (cylinder(18, 67, 12).translate(0, 0, 250)).translate(0, 0, 0).scale(scale).color(color));
p.part("front-glass", (cylinder(6, 55, 12).translate(0, 0, 268)).translate(0, 0, 0).scale(scale).color(color));
p.part("collar", (cylinder(20, 62, 12).translate(0, 0, 126)).translate(0, 0, 0).scale(scale).color(color));
p.part("collar-foot", (box(52, 32, 25, true).translate(0, 0, 115)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
