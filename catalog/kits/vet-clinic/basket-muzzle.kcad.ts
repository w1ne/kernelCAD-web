// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "basket-muzzle",
  license: 'CC0-1.0',
  title: "Basket muzzle",
  description: "Open-frame basket muzzle with nose band, side rails and a wider rear strap frame." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "basket", "muzzle", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#b49468", { label: 'Asset color' });
const p = assembly("basket-muzzle");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("front-rim-top", [160, 120, 20], [0, -180, 162]);
b("front-rim-bottom", [160, 120, 20], [0, -180, 38]);
b("front-rim-left", [20, 120, 145], [-70, -180, 100]);
b("front-rim-right", [20, 120, 145], [70, -180, 100]);
b("rear-rim-top", [330, 36, 24], [0, 125, 260]);
b("rear-rim-bottom", [330, 36, 24], [0, 125, 20]);
b("rear-rim-left", [24, 36, 255], [-153, 125, 140]);
b("rear-rim-right", [24, 36, 255], [153, 125, 140]);
b("upper-rail-left", [24, 320, 24], [-112, -27, 210], [0, 0, 15]);
b("upper-rail-right", [24, 320, 24], [112, -27, 210], [0, 0, -15]);
b("lower-rail-left", [24, 320, 24], [-112, -27, 30], [0, 0, 15]);
b("lower-rail-right", [24, 320, 24], [112, -27, 30], [0, 0, -15]);
b("basket-crossbar", [150, 24, 20], [0, -85, 120]);
b("crown-strap", [200, 36, 22], [0, 25, 260]);
b("chin-strap", [200, 36, 22], [0, 25, 11]);

return p.model();
