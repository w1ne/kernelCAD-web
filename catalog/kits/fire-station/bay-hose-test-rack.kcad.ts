// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "bay-hose-test-rack",
  license: 'CC0-1.0',
  title: "Hose test rack",
  description: "Ground-mounted rack with spaced hose couplings, test manifold and catch trough." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "hose", "test", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#70827e", { label: 'Asset color' });
const p = assembly("bay-hose-test-rack");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = cylinder(h, r, segments);
  if (axis && degrees) shape = shape.rotate(axis, degrees);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("trough", [1600, 500, 100], [0, 0, 50]);
b("upright-0", [48, 60, 980], [-650, 0, 540]);
b("upright-1", [48, 60, 980], [-325, 0, 540]);
b("upright-2", [48, 60, 980], [0, 0, 540]);
b("upright-3", [48, 60, 980], [325, 0, 540]);
b("upright-4", [48, 60, 980], [650, 0, 540]);
b("top-rail", [1470, 58, 58], [0, 0, 1030]);
c("coupling-0", 80, 42, 8, [-520, -85, 890], [1, 0, 0], 90);
c("coupling-1", 80, 42, 8, [-260, -85, 890], [1, 0, 0], 90);
c("coupling-2", 80, 42, 8, [0, -85, 890], [1, 0, 0], 90);
c("coupling-3", 80, 42, 8, [260, -85, 890], [1, 0, 0], 90);
c("coupling-4", 80, 42, 8, [520, -85, 890], [1, 0, 0], 90);
b("test-manifold", [450, 240, 190], [500, 0, 220]);

return p.model();
