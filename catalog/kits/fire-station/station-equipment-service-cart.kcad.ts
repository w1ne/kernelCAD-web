// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-equipment-service-cart",
  license: 'CC0-1.0',
  title: "Station equipment service cart",
  description: "Mobile two-shelf cart with labeled equipment bins and a push handle." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "equipment", "service", "cart"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#748781", { label: 'Asset color' });
const p = assembly("station-equipment-service-cart");

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

b("lower-shelf", [820, 500, 55], [0, 0, 190]);
b("upper-shelf", [820, 500, 55], [0, 0, 770]);
b("post-0", [42, 42, 680], [-365, -205, 480]);
b("post-1", [42, 42, 680], [365, -205, 480]);
b("post-2", [42, 42, 680], [-365, 205, 480]);
b("post-3", [42, 42, 680], [365, 205, 480]);
c("caster-0", 40, 40, 8, [-350, -195, 0]);
c("caster-1", 40, 40, 8, [350, -195, 0]);
c("caster-2", 40, 40, 8, [-350, 195, 0]);
c("caster-3", 40, 40, 8, [350, 195, 0]);
b("handle", [720, 42, 42], [0, 250, 1030]);

return p.model();
