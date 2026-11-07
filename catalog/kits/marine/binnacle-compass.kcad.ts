// Original kernelCAD low-poly deck-mounted binnacle compass with a tapered pedestal, protective hood and broad mounting feet.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "binnacle-compass",
  license: 'CC0-1.0',
  title: "Binnacle compass",
  description: "Deck-mounted binnacle compass with a tapered pedestal, protective hood and broad mounting feet. Knobs: overall scale and asset color.",
  tags: ["binnacle compass", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6b5940", { label: 'Asset color' });
const p = assembly("binnacle-compass");
p.part("base", (cylinder(45, 140, 12).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(color));
p.part("pedestal", (cylinder(320, 78, 10).translate(0, 0, 34)).translate(0, 0, 0).scale(scale).color(color));
p.part("shoulder", (cylinder(44, 118, 12).translate(0, 0, 340)).translate(0, 0, 0).scale(scale).color(color));
p.part("compass-bowl", (cylinder(130, 130, 12).translate(0, 0, 380)).translate(0, 0, 0).scale(scale).color(color));
p.part("hood", (sphere(138).scale([1, 1, 0.46]).translate(0, 0, 520)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount-left", (box(92, 75, 36, true).translate(-166, 0, 18)).translate(0, 0, 0).scale(scale).color(color));
p.part("mount-right", (box(92, 75, 36, true).translate(166, 0, 18)).translate(0, 0, 0).scale(scale).color(color));

return p.model();
