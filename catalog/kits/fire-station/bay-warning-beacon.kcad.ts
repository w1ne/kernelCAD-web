// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "bay-warning-beacon",
  license: 'CC0-1.0',
  title: "Bay warning beacon",
  description: "Wall-mounted red and green signal lamps for a vehicle bay opening." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "bay", "warning", "beacon"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#8b6b5c", { label: 'Asset color' });
const p = assembly("bay-warning-beacon");

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

b("wall-plate", [180, 48, 420], [0, 0, 1850]);
c("lower-lamp", 150, 82, 10, [0, -35, 1730]);
c("upper-lamp", 150, 82, 10, [0, -35, 1970]);
b("hood-lower", [190, 110, 24], [0, -24, 1815]);
b("hood-upper", [190, 110, 24], [0, -24, 2055]);

return p.model();
