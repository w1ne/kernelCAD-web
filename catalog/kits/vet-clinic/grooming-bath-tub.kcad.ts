// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "grooming-bath-tub",
  license: 'CC0-1.0',
  title: "Veterinary grooming bath tub",
  description: "Raised wash tub with splash rim, access ramp, faucet and handheld sprayer support." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "grooming", "bath", "tub", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7d8a84", { label: 'Asset color' });
const p = assembly("grooming-bath-tub");

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

b("tub-shell", [1320, 700, 300], [0, 0, 900]);
b("inner-basin", [1160, 550, 160], [0, 0, 1050]);
b("front-rim", [1380, 65, 60], [0, -345, 1080]);
b("rear-rim", [1380, 65, 60], [0, 345, 1080]);
b("left-rim", [65, 630, 60], [-650, 0, 1080]);
b("right-rim", [65, 630, 60], [650, 0, 1080]);
b("leg-left-front", [66, 66, 850], [-540, -260, 425]);
b("leg-right-front", [66, 66, 850], [540, -260, 425]);
b("leg-left-back", [66, 66, 850], [-540, 260, 425]);
b("leg-right-back", [66, 66, 850], [540, 260, 425]);
b("access-ramp", [480, 570, 55], [0, -620, 455], [28, 0, 0]);
c("faucet-riser", 280, 22, 10, [450, 215, 1090]);
b("sprayer-handle", [44, 220, 54], [450, 65, 1000]);

return p.model();
