// Original kernelCAD low-poly small coastal fishing boat with a deep hull, wheelhouse, roof mast, deck rail and stern work area.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "fishing-boat",
  license: 'CC0-1.0',
  title: "Fishing boat",
  description: "Small coastal fishing boat with a deep hull, wheelhouse, roof mast, deck rail and stern work area. Knobs: overall scale and asset color.",
  tags: ["fishing boat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#465a62", { label: 'Asset color' });
const p = assembly("fishing-boat");
p.part("hull", (extrudePolygon([[-760, 0], [-520, 300], [400, 300], [680, 180], [720, 0], [680, -180], [400, -300], [-520, -300]], 190).translate(0, 0, 30)).translate(0, 0, -30).scale(scale).color(color));
p.part("deck", (box(1150, 510, 45, true).translate(-30, 0, 244)).translate(0, 0, -30).scale(scale).color(color));
p.part("wheelhouse", (box(430, 390, 370, true).translate(-220, 0, 450)).translate(0, 0, -30).scale(scale).color(color));
p.part("front-window", (box(250, 14, 120, true).translate(-25, -198, 480)).translate(0, 0, -30).scale(scale).color(color));
p.part("roof", (box(510, 470, 48, true).translate(-220, 0, 660)).translate(0, 0, -30).scale(scale).color(color));
p.part("mast", (cylinder(440, 14, 8).translate(-220, 0, 684)).translate(0, 0, -30).scale(scale).color(color));
p.part("stern-rail", (box(180, 560, 28, true).translate(-620, 0, 394)).translate(0, 0, -30).scale(scale).color(color));
p.part("bow-rail", (box(170, 42, 28, true).translate(520, 0, 394)).translate(0, 0, -30).scale(scale).color(color));

return p.model();
