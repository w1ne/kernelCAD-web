// Original kernelCAD low-poly compact harbor tug with a sturdy hull, tall bridge cabin, twin exhaust stacks and a bow fender.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "tugboat",
  license: 'CC0-1.0',
  title: "Harbor tugboat",
  description: "Compact harbor tug with a sturdy hull, tall bridge cabin, twin exhaust stacks and a bow fender. Knobs: overall scale and asset color.",
  tags: ["tugboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#3f5965", { label: 'Asset color' });
const p = assembly("tugboat");
p.part("hull", (extrudePolygon([[-610, 0], [-430, 275], [370, 275], [560, 145], [610, 0], [560, -145], [370, -275], [-430, -275]], 180).translate(0, 0, 35)).translate(0, 0, -35).scale(scale).color(color));
p.part("deck", (box(950, 470, 42, true).translate(-10, 0, 218)).translate(0, 0, -35).scale(scale).color(color));
p.part("cabin", (box(390, 340, 360, true).translate(-130, 0, 418)).translate(0, 0, -35).scale(scale).color(color));
p.part("bridge", (box(430, 390, 130, true).translate(-130, 0, 646)).translate(0, 0, -35).scale(scale).color(color));
p.part("front-glass", (box(300, 12, 90, true).translate(91, -173, 670)).translate(0, 0, -35).scale(scale).color(color));
p.part("stack-one", (cylinder(180, 38, 10).translate(-240, -85, 780)).translate(0, 0, -35).scale(scale).color(color));
p.part("stack-two", (cylinder(180, 38, 10).translate(-240, 85, 780)).translate(0, 0, -35).scale(scale).color(color));
p.part("bow-fender", (sphere(92).scale([0.7, 1.25, 0.55]).translate(570, 0, 220)).translate(0, 0, -35).scale(scale).color(color));

return p.model();
