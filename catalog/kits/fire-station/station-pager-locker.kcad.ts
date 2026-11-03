// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-pager-locker",
  license: 'CC0-1.0',
  title: "Station pager locker",
  description: "Small lockable charging cabinet with individual numbered slots and status lights." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "pager", "locker"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#73817c", { label: 'Asset color' });
const p = assembly("station-pager-locker");

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

b("cabinet", [920, 420, 1250], [0, 0, 625]);
b("door", [860, 32, 1170], [0, -220, 625]);
b("slot-0", [185, 18, 230], [-305, -245, 790]);
b("slot-1", [185, 18, 230], [0, -245, 790]);
b("slot-2", [185, 18, 230], [305, -245, 790]);
b("slot-3", [185, 18, 230], [610, -245, 790]);
c("ready-light-0", 20, 22, 8, [-305, -250, 1100]);
c("ready-light-1", 20, 22, 8, [0, -250, 1100]);
c("ready-light-2", 20, 22, 8, [305, -250, 1100]);
c("ready-light-3", 20, 22, 8, [610, -250, 1100]);
b("name-strip", [600, 18, 70], [0, -245, 1190]);

return p.model();
