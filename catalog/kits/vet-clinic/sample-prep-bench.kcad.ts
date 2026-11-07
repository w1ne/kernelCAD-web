// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "sample-prep-bench",
  license: 'CC0-1.0',
  title: "Veterinary sample preparation bench",
  description: "Lab bench with drawers, tube rack and reagent bottles for a clinic diagnostics room." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "sample", "preparation", "bench", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7f8d88", { label: 'Asset color' });
const p = assembly("sample-prep-bench");

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

b("worktop", [1260, 600, 70], [0, 0, 830]);
b("cabinet-left", [360, 520, 800], [-420, 0, 400]);
b("cabinet-right", [360, 520, 800], [420, 0, 400]);
b("drawer-left-top", [300, 28, 110], [-420, -277, 660]);
b("drawer-right-top", [300, 28, 110], [420, -277, 660]);
b("tube-rack", [420, 140, 90], [0, -90, 910]);
c("tube-0", 145, 18, 8, [-160, -90, 1000]);
c("tube-1", 145, 18, 8, [-80, -90, 1000]);
c("tube-2", 145, 18, 8, [0, -90, 1000]);
c("tube-3", 145, 18, 8, [80, -90, 1000]);
c("tube-4", 145, 18, 8, [160, -90, 1000]);
c("reagent-bottle-a", 210, 48, 10, [-385, 90, 970]);
c("reagent-bottle-b", 210, 48, 10, [385, 90, 970]);

return p.model();
