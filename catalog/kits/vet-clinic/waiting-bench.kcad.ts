// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "waiting-bench",
  license: 'CC0-1.0',
  title: "Clinic waiting bench",
  description: "Three-seat waiting bench with a continuous back, arm rests and open leg clearance." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "clinic", "waiting", "bench", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#78909a", { label: 'Asset color' });
const p = assembly("waiting-bench");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("seat", [1500, 450, 88], [0, 0, 450]);
b("back", [1500, 92, 620], [0, 170, 800]);
b("arm-left", [90, 510, 180], [-700, 0, 570]);
b("arm-right", [90, 510, 180], [700, 0, 570]);
b("front-left-leg", [90, 90, 390], [-600, -110, 195]);
b("front-right-leg", [90, 90, 390], [600, -110, 195]);
b("rear-left-leg", [90, 90, 390], [-600, 130, 195]);
b("rear-right-leg", [90, 90, 390], [600, 130, 195]);
b("lower-crossbar", [1250, 55, 45], [0, 0, 90]);

return p.model();
