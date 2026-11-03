// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "scba-cylinder-drying-rack",
  license: 'CC0-1.0',
  title: "SCBA cylinder drying rack",
  description: "Wall rack for clean breathing-air cylinders with four cradles and retaining straps." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "scba", "cylinder", "drying", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#74847e", { label: 'Asset color' });
const p = assembly("scba-cylinder-drying-rack");

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

b("backplate", [1400, 60, 820], [0, 0, 1320]);
c("cradle-0", 420, 82, 10, [-480, -120, 1000], [1, 0, 0], 90);
c("cradle-1", 420, 82, 10, [-160, -120, 1000], [1, 0, 0], 90);
c("cradle-2", 420, 82, 10, [160, -120, 1000], [1, 0, 0], 90);
c("cradle-3", 420, 82, 10, [480, -120, 1000], [1, 0, 0], 90);
b("strap-0", [70, 45, 360], [-480, -180, 1310]);
b("strap-1", [70, 45, 360], [-160, -180, 1310]);
b("strap-2", [70, 45, 360], [160, -180, 1310]);
b("strap-3", [70, 45, 360], [480, -180, 1310]);
b("label-strip", [1220, 24, 105], [0, -44, 1740]);

return p.model();
