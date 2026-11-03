// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "bay-utility-hose-station",
  license: 'CC0-1.0',
  title: "Bay utility hose station",
  description: "Wall-mounted compressed-air and water hose outlets with two short reel lines." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "bay", "utility", "hose"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7b8980", { label: 'Asset color' });
const p = assembly("bay-utility-hose-station");

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

b("panel", [500, 65, 420], [0, 0, 1450]);
b("shelf", [600, 200, 52], [0, -105, 1214]);
c("outlet-0", 48, 34, 8, [-150, -45, 1510], [1, 0, 0], 90);
c("outlet-1", 48, 34, 8, [0, -45, 1510], [1, 0, 0], 90);
c("outlet-2", 48, 34, 8, [150, -45, 1510], [1, 0, 0], 90);
c("hose-loop-0", 36, 165, 10, [-150, -105, 1820], [1, 0, 0], 90);
c("hose-loop-1", 36, 165, 10, [150, -105, 1820], [1, 0, 0], 90);

return p.model();
