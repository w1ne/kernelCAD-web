// Throw rope bag: A compact throw bag has a shoulder, grab loop, reinforced base, and side grip. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "throw-rope-bag",
  license: 'CC0-1.0',
  title: "Throw rope bag",
  description: "Throw rope bag: A compact throw bag has a shoulder, grab loop, reinforced base, and side grip. Low-poly visualization prop. Material controls: safety fabric, rope fiber, nylon webbing, rubber.",
  tags: ["throw rope bag", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyFabric = param('safetyFabric', '#e6a744', { label: 'Safety fabric' });
const ropeFiber = param('ropeFiber', '#a78a5d', { label: 'Rope fiber' });
const nylonWebbing = param('nylonWebbing', '#314954', { label: 'Nylon webbing' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { safetyFabric: '#c6974a', ropeFiber: '#99825c', nylonWebbing: '#445356', rubber: '#434542' },
  highVisibility: { safetyFabric: '#f17b39' },
});
const p = assembly("throw-rope-bag");
p.part("bag", (cylinder(250, 100, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(safetyFabric));
p.part("shoulder", (cylinder(85, 78, 10).translate(0, 0, 228)).translate(0, 0, 0).scale(scale).color(safetyFabric));
p.part("top-loop", (cylinder(24, 42, 10).subtract(cylinder(26, 23, 10).translate(0, 0, -1)).translate(0, 0, 296)).translate(0, 0, 0).scale(scale).color(ropeFiber));
p.part("base-band", (cylinder(30, 106, 10).translate(0, 0, 12)).translate(0, 0, 0).scale(scale).color(nylonWebbing));
p.part("side-grip", (box(22, 60, 120, true).translate(104, 0, 136)).translate(0, 0, 0).scale(scale).color(rubber));

return p.model();
