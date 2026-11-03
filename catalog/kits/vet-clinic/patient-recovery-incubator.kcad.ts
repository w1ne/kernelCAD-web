// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "patient-recovery-incubator",
  license: 'CC0-1.0',
  title: "Patient recovery incubator",
  description: "Compact recovery enclosure with a raised access hood, internal shelf and front controller." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "patient", "recovery", "incubator", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7b8983", { label: 'Asset color' });
const p = assembly("patient-recovery-incubator");

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

b("wheeled-base", [820, 650, 190], [0, 0, 95]);
c("caster-a", 32, 42, 8, [-300, -235, 18]);
c("caster-b", 32, 42, 8, [300, -235, 18]);
b("lower-chamber", [760, 600, 500], [0, 0, 440]);
b("upper-hood", [760, 600, 290], [0, 0, 835]);
b("front-access-door", [650, 40, 540], [0, -325, 690]);
b("door-window", [520, 14, 390], [0, -350, 720]);
b("inside-shelf", [650, 470, 35], [0, 0, 570]);
b("controller", [190, 56, 220], [270, -330, 920]);
b("top-handle", [260, 42, 35], [0, -20, 990]);

return p.model();
