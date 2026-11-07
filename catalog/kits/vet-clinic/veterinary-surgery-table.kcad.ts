// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "veterinary-surgery-table",
  license: 'CC0-1.0',
  title: "Veterinary surgery table",
  description: "Height-lift operating table with drainage tray, adjustable side ledges and support frame." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "surgery", "table", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#788987", { label: 'Asset color' });
const p = assembly("veterinary-surgery-table");

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

b("base-plate", [960, 590, 110], [0, 0, 80]);
b("lift-column", [250, 230, 650], [0, 0, 460]);
b("table-center", [1040, 560, 70], [0, 0, 810]);
b("table-wing-left", [320, 560, 70], [-670, 0, 810], [0, -6, 0]);
b("table-wing-right", [320, 560, 70], [670, 0, 810], [0, 6, 0]);
b("drain-channel", [820, 70, 38], [0, 0, 760]);
b("side-ledge-left", [1040, 36, 50], [0, -300, 805]);
b("side-ledge-right", [1040, 36, 50], [0, 300, 805]);
c("leveling-foot-a", 40, 48, 8, [-400, -220, 0]);
c("leveling-foot-b", 40, 48, 8, [400, -220, 0]);

return p.model();
