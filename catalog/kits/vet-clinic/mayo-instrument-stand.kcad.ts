// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "mayo-instrument-stand",
  license: 'CC0-1.0',
  title: "Mayo instrument stand",
  description: "Height-adjustable instrument tray on a narrow mobile base with four small casters." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "mayo", "instrument", "stand", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#788986", { label: 'Asset color' });
const p = assembly("mayo-instrument-stand");

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

b("base-spoke-x", [510, 55, 48], [0, 0, 31]);
b("base-spoke-y", [55, 440, 48], [0, 0, 31]);
c("caster-a", 30, 32, 8, [-210, -170, 0]);
c("caster-b", 30, 32, 8, [210, -170, 0]);
c("column", 990, 26, 10, [0, 0, 51]);
b("height-clamp", [105, 90, 90], [0, 0, 686]);
b("tray", [600, 410, 42], [0, -10, 1066]);
b("tray-lip-front", [600, 28, 38], [0, -214, 1104]);
b("tray-lip-left", [28, 380, 34], [-286, -10, 1104]);
b("tray-lip-right", [28, 380, 34], [286, -10, 1104]);

return p.model();
