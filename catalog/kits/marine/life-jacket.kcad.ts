// Life jacket: A shaped torso has paired flotation panels, a collar, waist strap, and buckle. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "life-jacket",
  license: 'CC0-1.0',
  title: "Life jacket",
  description: "Life jacket: A shaped torso has paired flotation panels, a collar, waist strap, and buckle. Low-poly visualization prop. Material controls: safety fabric, closed-cell safety foam, nylon webbing, marine hardware.",
  tags: ["life jacket", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyFabric = param('safetyFabric', '#e15a38', { label: 'Safety fabric' });
const safetyFoam = param('safetyFoam', '#f0bf3a', { label: 'Closed-cell safety foam' });
const nylonWebbing = param('nylonWebbing', '#314954', { label: 'Nylon webbing' });
const marineHardware = param('marineHardware', '#b1b9b7', { label: 'Marine hardware' });
presets({
  weathered: { safetyFabric: '#c25f42', safetyFoam: '#cda843', nylonWebbing: '#445356', marineHardware: '#a0a49d' },
  highVisibility: { safetyFabric: '#f17b39' },
});
const p = assembly("life-jacket");
p.part("torso", (box(300, 150, 360, true).translate(0, 0, 275)).translate(0, 0, -94).scale(scale).color(safetyFabric));
p.part("left-flotation", (box(120, 180, 370, true).rotate([0, 1, 0], 9).translate(-125, 0, 300)).translate(0, 0, -94).scale(scale).color(safetyFoam));
p.part("right-flotation", (box(120, 180, 370, true).rotate([0, 1, 0], -9).translate(125, 0, 300)).translate(0, 0, -94).scale(scale).color(safetyFoam));
p.part("collar-left", (sphere(90).scale([0.9, 1, 0.55]).translate(-94, 0, 485)).translate(0, 0, -94).scale(scale).color(safetyFabric));
p.part("collar-right", (sphere(90).scale([0.9, 1, 0.55]).translate(94, 0, 485)).translate(0, 0, -94).scale(scale).color(safetyFabric));
p.part("waist-strap", (box(330, 24, 44, true).translate(0, 0, 118)).translate(0, 0, -94).scale(scale).color(nylonWebbing));
p.part("buckle", (box(55, 32, 48, true).translate(0, -4, 118)).translate(0, 0, -94).scale(scale).color(marineHardware));

return p.model();
