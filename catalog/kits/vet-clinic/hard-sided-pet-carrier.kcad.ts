// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "hard-sided-pet-carrier",
  license: 'CC0-1.0',
  title: "Hard-sided pet carrier",
  description: "Portable carrier with a ventilated door, side walls, roof and carry handle." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "hard-sided", "pet", "carrier", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#8a7869", { label: 'Asset color' });
const p = assembly("hard-sided-pet-carrier");

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

b("floor", [470, 650, 34], [0, 0, 17]);
b("rear-wall", [470, 38, 360], [0, 306, 214]);
b("left-wall", [38, 600, 360], [-216, 0, 214]);
b("right-wall", [38, 600, 360], [216, 0, 214]);
b("roof", [470, 650, 34], [0, 0, 397]);
b("door-top", [398, 34, 38], [0, -306, 374]);
b("door-bottom", [398, 34, 38], [0, -306, 54]);
b("door-left", [34, 34, 320], [-182, -306, 214]);
b("door-right", [34, 34, 320], [182, -306, 214]);
c("door-bar-a", 290, 9, 8, [-90, -326, 214], [1, 0, 0], 90);
c("door-bar-b", 290, 9, 8, [0, -326, 214], [1, 0, 0], 90);
c("door-bar-c", 290, 9, 8, [90, -326, 214], [1, 0, 0], 90);
b("carry-handle", [150, 48, 30], [0, 0, 430]);

return p.model();
