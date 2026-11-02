// Original kernelCAD low-poly small motor yacht with a swept bow, two-level cabin, dark window band and swim platform.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "yacht",
  license: 'CC0-1.0',
  title: "Motor yacht",
  description: "Small motor yacht with a swept bow, two-level cabin, dark window band and swim platform. Knobs: overall scale and asset color.",
  tags: ["yacht", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#e2e0d4", { label: 'Asset color' });
const p = assembly("yacht");
p.part("hull", (extrudePolygon([[-780, 0], [-540, 290], [430, 280], [700, 170], [760, 0], [700, -170], [430, -280], [-540, -290]], 175).translate(0, 0, 35)).translate(0, 0, -35).scale(scale).color(color));
p.part("deck", (box(1250, 490, 40, true).translate(-5, 0, 212)).translate(0, 0, -35).scale(scale).color(color));
p.part("lower-cabin", (box(500, 350, 260, true).translate(-205, 0, 362)).translate(0, 0, -35).scale(scale).color(color));
p.part("upper-cabin", (box(380, 300, 180, true).translate(-150, 0, 582)).translate(0, 0, -35).scale(scale).color(color));
p.part("window-band", (box(450, 16, 86, true).translate(-190, -178, 393)).translate(0, 0, -35).scale(scale).color(color));
p.part("roof", (box(440, 350, 40, true).translate(-150, 0, 692)).translate(0, 0, -35).scale(scale).color(color));
p.part("swim-platform", (box(230, 380, 42, true).translate(-700, 0, 180)).translate(0, 0, -35).scale(scale).color(color));
p.part("bow-rail", (box(180, 32, 22, true).translate(560, 0, 300)).translate(0, 0, -35).scale(scale).color(color));

return p.model();
