// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-fitness-weight-rack",
  license: 'CC0-1.0',
  title: "Station fitness weight rack",
  description: "Low equipment rack with tiered shelves and end stops for training weights." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "fitness", "weight", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#717d78", { label: 'Asset color' });
const p = assembly("station-fitness-weight-rack");

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

b("base", [1500, 480, 80], [0, 0, 40]);
b("upright-0", [55, 55, 1080], [-650, -180, 580]);
b("upright-1", [55, 55, 1080], [650, -180, 580]);
b("upright-2", [55, 55, 1080], [-650, 180, 580]);
b("upright-3", [55, 55, 1080], [650, 180, 580]);
b("lower-shelf", [1380, 420, 55], [0, 0, 350]);
b("upper-shelf", [1380, 420, 55], [0, 0, 850]);
c("weight-stop-0", 140, 55, 8, [-500, -120, 420]);
c("weight-stop-1", 140, 55, 8, [-250, -120, 420]);
c("weight-stop-2", 140, 55, 8, [0, -120, 420]);
c("weight-stop-3", 140, 55, 8, [250, -120, 420]);
c("weight-stop-4", 140, 55, 8, [500, -120, 420]);

return p.model();
