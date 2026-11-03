// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "oxygen-therapy-cage",
  license: 'CC0-1.0',
  title: "Veterinary oxygen therapy cage",
  description: "Sealed care cage with a gasketed door frame, flow-control panel and a low wheeled base." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "oxygen", "therapy", "cage", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#657b81", { label: 'Asset color' });
const p = assembly("oxygen-therapy-cage");

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

b("base-cabinet", [880, 720, 220], [0, 0, 110]);
b("chamber", [820, 660, 740], [0, 0, 590]);
b("door-frame", [700, 48, 620], [0, -360, 590]);
b("door-window", [570, 20, 490], [0, -390, 620]);
b("lower-kick", [690, 38, 120], [0, -375, 260]);
b("flow-panel", [250, 58, 210], [260, -365, 920]);
c("flow-meter", 150, 30, 10, [260, -415, 945], [1, 0, 0], 90);
c("inlet-port", 38, 50, 10, [-290, 0, 720], [1, 0, 0], 90);
c("caster-a", 36, 48, 8, [-330, -250, 20]);
c("caster-b", 36, 48, 8, [330, -250, 20]);

return p.model();
