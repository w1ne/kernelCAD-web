// Original kernelCAD low-poly film slate with a striped hinged top stick, broad writing board and lower frame ledge.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "clapperboard",
  license: 'CC0-1.0',
  title: "Clapperboard",
  description: "Film slate with a striped hinged top stick, broad writing board and lower frame ledge. Knobs: overall scale and asset color.",
  tags: ["clapperboard", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#25292c", { label: 'Asset color' });
const p = assembly("clapperboard");
p.part("board", (box(440, 36, 300, true).translate(0, 0, 190)).translate(0, 0, -22).scale(scale).color(color));
p.part("face", (box(400, 8, 250, true).translate(0, -22, 192)).translate(0, 0, -22).scale(scale).color(color));
p.part("top-stick", (box(470, 42, 54, true).rotate([0, 1, 0], -8).translate(0, 0, 369)).translate(0, 0, -22).scale(scale).color(color));
p.part("hinge-left", (cylinder(26, 18, 8).rotate([1, 0, 0], 90).translate(-205, -20, 340)).translate(0, 0, -22).scale(scale).color(color));
p.part("hinge-right", (cylinder(26, 18, 8).rotate([1, 0, 0], 90).translate(205, -20, 340)).translate(0, 0, -22).scale(scale).color(color));
p.part("lower-ledge", (box(458, 50, 28, true).translate(0, -2, 36)).translate(0, 0, -22).scale(scale).color(color));

return p.model();
