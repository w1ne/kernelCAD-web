// Original kernelCAD low-poly thick mooring rope arranged in three low coils with a short loose end and eye splice.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "coiled-mooring-rope",
  license: 'CC0-1.0',
  title: "Coiled mooring rope",
  description: "Thick mooring rope arranged in three low coils with a short loose end and eye splice. Knobs: overall scale and asset color.",
  tags: ["coiled mooring rope", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#9c8258", { label: 'Asset color' });
const p = assembly("coiled-mooring-rope");
p.part("coil-outer", (cylinder(36, 260, 16).subtract(cylinder(38, 174, 16).translate(0, 0, -1)).translate(0, 0, 0)).translate(0, 0, 6).scale(scale).color(color));
p.part("coil-middle", (cylinder(36, 190, 16).subtract(cylinder(38, 108, 16).translate(0, 0, -1)).translate(0, 0, 32)).translate(0, 0, 6).scale(scale).color(color));
p.part("coil-inner", (cylinder(36, 118, 16).subtract(cylinder(38, 50, 16).translate(0, 0, -1)).translate(0, 0, 64)).translate(0, 0, 6).scale(scale).color(color));
p.part("loose-end", (cylinder(410, 26, 10).rotate([0, 1, 0], 90).translate(270, 0, 20)).translate(0, 0, 6).scale(scale).color(color));
p.part("eye-splice", (cylinder(30, 38, 10).subtract(cylinder(32, 20, 10).translate(0, 0, -1)).translate(465, 0, 20)).translate(0, 0, 6).scale(scale).color(color));

return p.model();
