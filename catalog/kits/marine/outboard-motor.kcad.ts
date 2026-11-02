// Original kernelCAD low-poly compact outboard boat motor with a powerhead, tiller handle, midsection and propeller skeg.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "outboard-motor",
  license: 'CC0-1.0',
  title: "Outboard motor",
  description: "Compact outboard boat motor with a powerhead, tiller handle, midsection and propeller skeg. Knobs: overall scale and asset color.",
  tags: ["outboard motor", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#50565a", { label: 'Asset color' });
const p = assembly("outboard-motor");
p.part("powerhead", (box(230, 180, 260, true).translate(0, 0, 585)).translate(0, 0, 35).scale(scale).color(color));
p.part("top-cover", (sphere(125).scale([1, 0.75, 0.9]).translate(0, 0, 728)).translate(0, 0, 35).scale(scale).color(color));
p.part("midsection", (box(110, 100, 350, true).translate(0, 0, 275)).translate(0, 0, 35).scale(scale).color(color));
p.part("gearcase", (sphere(75).scale([0.8, 1, 1.2]).translate(0, 0, 83)).translate(0, 0, 35).scale(scale).color(color));
p.part("skeg", (box(36, 90, 140, true).translate(0, 0, 35)).translate(0, 0, 35).scale(scale).color(color));
p.part("prop-shaft", (cylinder(110, 20, 8).rotate([1, 0, 0], 90).translate(0, -45, 80)).translate(0, 0, 35).scale(scale).color(color));
p.part("prop-blade-1", (box(24, 210, 44, true).rotate([0, 0, 1], 25).translate(0, -148, 80)).translate(0, 0, 35).scale(scale).color(color));
p.part("prop-blade-2", (box(24, 210, 44, true).rotate([0, 0, 1], 145).translate(0, -148, 80)).translate(0, 0, 35).scale(scale).color(color));
p.part("tiller", (cylinder(320, 18, 8).rotate([0, 1, 0], 90).translate(130, 0, 700)).translate(0, 0, 35).scale(scale).color(color));
p.part("clamp", (box(190, 145, 38, true).translate(0, 0, 412)).translate(0, 0, 35).scale(scale).color(color));

return p.model();
