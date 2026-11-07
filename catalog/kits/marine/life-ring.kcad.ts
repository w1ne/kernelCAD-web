// Life ring: A buoyant ring is marked by four cross straps and a retrieval loop. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "life-ring",
  license: 'CC0-1.0',
  title: "Life ring",
  description: "Life ring: A buoyant ring is marked by four cross straps and a retrieval loop. Low-poly visualization prop. Material controls: closed-cell safety foam, nylon webbing, rope fiber.",
  tags: ["life ring", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyFoam = param('safetyFoam', '#d5503e', { label: 'Closed-cell safety foam' });
const nylonWebbing = param('nylonWebbing', '#314954', { label: 'Nylon webbing' });
const ropeFiber = param('ropeFiber', '#a78a5d', { label: 'Rope fiber' });
presets({
  weathered: { safetyFoam: '#ba5846', nylonWebbing: '#445356', ropeFiber: '#99825c' },
  highVisibility: { safetyFoam: '#f17939' },
});
const p = assembly("life-ring");
p.part("ring-body", (cylinder(34, 178, 20).subtract(cylinder(36, 112, 20).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 178)).translate(0, 0, 27).scale(scale).color(safetyFoam));
p.part("strap-1", (box(24, 44, 115, true).rotate([0, 1, 0], 45).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(nylonWebbing));
p.part("strap-2", (box(24, 44, 115, true).rotate([0, 1, 0], -45).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(nylonWebbing));
p.part("strap-3", (box(24, 44, 115, true).rotate([0, 1, 0], 135).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(nylonWebbing));
p.part("strap-4", (box(24, 44, 115, true).rotate([0, 1, 0], -135).translate(0, -5, 178)).translate(0, 0, 27).scale(scale).color(nylonWebbing));
p.part("rope-loop", (cylinder(18, 205, 16).subtract(cylinder(20, 187, 16).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 178)).translate(0, 0, 27).scale(scale).color(ropeFiber));

return p.model();
