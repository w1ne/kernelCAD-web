// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "mobile-surgical-light",
  license: 'CC0-1.0',
  title: "Mobile surgical light",
  description: "Mobile multi-head procedure light with a floor mast and articulated overhead arm." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "mobile", "surgical", "light", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#83918a", { label: 'Asset color' });
const p = assembly("mobile-surgical-light");

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

b("base-cross-x", [620, 80, 72], [0, 0, 36]);
b("base-cross-y", [80, 560, 72], [0, 0, 36]);
c("caster-a", 36, 42, 8, [-260, -220, 6]);
c("caster-b", 36, 42, 8, [260, -220, 6]);
c("caster-c", 36, 42, 8, [-260, 220, 6]);
c("mast", 1570, 38, 10, [0, 0, 71]);
b("arm-lower", [620, 44, 44], [270, 0, 1536], [0, 0, -8]);
b("arm-upper", [500, 44, 44], [720, 0, 1466], [0, 0, 14]);
c("lamp-yoke", 105, 28, 10, [960, 0, 1436], [0, 1, 0], 90);
c("light-head", 80, 210, 14, [960, 0, 1341]);
c("lamp-lens-1", 20, 26, 10, [840, 0, 1296]);
c("lamp-lens-2", 20, 26, 10, [960, -110, 1296]);
c("lamp-lens-3", 20, 26, 10, [1080, 0, 1296]);
c("lamp-lens-4", 20, 26, 10, [960, 110, 1296]);

return p.model();
