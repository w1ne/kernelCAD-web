// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "stainless-kennel-bank",
  license: 'CC0-1.0',
  title: "Three-bay stainless kennel bank",
  description: "Three-bay clinic kennel bank with tray fronts, shared frame and barred doors." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "three-bay", "stainless", "kennel", "bank", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7d8987", { label: 'Asset color' });
const p = assembly("stainless-kennel-bank");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("base-plinth", [1740, 700, 120], [0, 0, 60]);
b("roof", [1740, 700, 80], [0, 0, 1220]);
b("rear-panel", [1680, 40, 1080], [0, 320, 660]);
b("left-side", [40, 660, 1080], [-820, 0, 660]);
b("right-side", [40, 660, 1080], [820, 0, 660]);
b("partition-left", [38, 650, 1080], [-275, 0, 660]);
b("partition-right", [38, 650, 1080], [275, 0, 660]);
b("door-post-0", [24, 32, 930], [-820, -340, 660]);
b("door-post-1", [24, 32, 930], [-275, -340, 660]);
b("door-post-2", [24, 32, 930], [275, -340, 660]);
b("door-post-3", [24, 32, 930], [820, -340, 660]);
b("door-bar-0", [18, 24, 850], [-760, -350, 660]);
b("door-bar-1", [18, 24, 850], [-665, -350, 660]);
b("door-bar-2", [18, 24, 850], [-570, -350, 660]);
b("door-bar-3", [18, 24, 850], [-475, -350, 660]);
b("door-bar-4", [18, 24, 850], [-380, -350, 660]);
b("door-bar-5", [18, 24, 850], [-285, -350, 660]);
b("door-bar-6", [18, 24, 850], [-190, -350, 660]);
b("door-bar-7", [18, 24, 850], [-95, -350, 660]);
b("door-bar-8", [18, 24, 850], [0, -350, 660]);
b("door-bar-9", [18, 24, 850], [95, -350, 660]);
b("door-bar-10", [18, 24, 850], [190, -350, 660]);
b("door-bar-11", [18, 24, 850], [285, -350, 660]);
b("door-bar-12", [18, 24, 850], [380, -350, 660]);
b("door-bar-13", [18, 24, 850], [475, -350, 660]);
b("door-bar-14", [18, 24, 850], [570, -350, 660]);
b("door-bar-15", [18, 24, 850], [665, -350, 660]);
b("door-bar-16", [18, 24, 850], [760, -350, 660]);
b("tray-left", [520, 600, 35], [-550, 0, 138]);
b("tray-center", [520, 600, 35], [0, 0, 138]);
b("tray-right", [520, 600, 35], [550, 0, 138]);

return p.model();
