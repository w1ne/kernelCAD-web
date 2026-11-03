// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "isolation-kennel",
  license: 'CC0-1.0',
  title: "Veterinary isolation kennel",
  description: "Single isolation bay with solid side panels, a framed barred door and status card." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "isolation", "kennel", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#788580", { label: 'Asset color' });
const p = assembly("isolation-kennel");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("floor-pan", [850, 760, 80], [0, 0, 40]);
b("rear-panel", [850, 46, 980], [0, 350, 570]);
b("left-panel", [46, 700, 980], [-402, 0, 570]);
b("right-panel", [46, 700, 980], [402, 0, 570]);
b("top-cap", [920, 820, 70], [0, 0, 1095]);
b("door-top", [700, 45, 55], [0, -380, 1040]);
b("door-bottom", [700, 45, 55], [0, -380, 110]);
b("door-left", [48, 45, 870], [-326, -380, 570]);
b("door-right", [48, 45, 870], [326, -380, 570]);
b("door-bar-0", [18, 24, 820], [-240, -403, 570]);
b("door-bar-1", [18, 24, 820], [-160, -403, 570]);
b("door-bar-2", [18, 24, 820], [-80, -403, 570]);
b("door-bar-3", [18, 24, 820], [0, -403, 570]);
b("door-bar-4", [18, 24, 820], [80, -403, 570]);
b("door-bar-5", [18, 24, 820], [160, -403, 570]);
b("door-bar-6", [18, 24, 820], [240, -403, 570]);
b("status-card-holder", [210, 35, 125], [300, -410, 945]);

return p.model();
