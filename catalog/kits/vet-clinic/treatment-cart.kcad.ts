// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "treatment-cart",
  license: 'CC0-1.0',
  title: "Veterinary treatment cart",
  description: "Two-shelf mobile cart with shallow drawers, push handle and four casters." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "treatment", "cart", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#74888b", { label: 'Asset color' });
const p = assembly("treatment-cart");

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

b("lower-shelf", [650, 460, 58], [0, 0, 173]);
b("upper-shelf", [650, 460, 58], [0, 0, 633]);
b("drawer-one", [390, 44, 110], [0, -215, 533]);
b("drawer-two", [390, 44, 110], [0, -215, 388]);
b("post-a", [45, 45, 630], [-285, -190, 323]);
b("post-b", [45, 45, 630], [285, -190, 323]);
b("post-c", [45, 45, 630], [-285, 190, 323]);
b("post-d", [45, 45, 630], [285, 190, 323]);
c("caster-a", 42, 44, 8, [-270, -185, 0]);
c("caster-b", 42, 44, 8, [270, -185, 0]);
b("push-handle", [520, 42, 42], [0, 230, 838]);

return p.model();
