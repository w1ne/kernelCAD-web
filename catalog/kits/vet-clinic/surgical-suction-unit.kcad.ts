// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "surgical-suction-unit",
  license: 'CC0-1.0',
  title: "Veterinary surgical suction unit",
  description: "Mobile suction cart with collection canister, gauge, control housing and hose outlet." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "surgical", "suction", "unit", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6b8082", { label: 'Asset color' });
const p = assembly("surgical-suction-unit");

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

b("cart-base", [470, 380, 80], [0, 0, 130]);
c("wheel-a", 34, 42, 8, [-180, -135, 0]);
c("wheel-b", 34, 42, 8, [180, -135, 0]);
b("pump-housing", [370, 330, 350], [0, 0, 345]);
c("collection-canister", 360, 112, 12, [0, 0, 565]);
c("canister-lid", 36, 126, 12, [0, 0, 910]);
c("vacuum-gauge", 24, 48, 10, [118, -180, 455], [1, 0, 0], 90);
c("hose-outlet", 75, 25, 10, [-165, -155, 460], [1, 0, 0], 90);
b("push-handle", [440, 44, 42], [0, 155, 760]);
b("side-control", [120, 34, 120], [205, -65, 400]);

return p.model();
