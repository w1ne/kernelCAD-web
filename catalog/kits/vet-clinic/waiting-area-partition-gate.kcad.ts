// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "waiting-area-partition-gate",
  license: 'CC0-1.0',
  title: "Waiting area partition gate",
  description: "Freestanding gate panel with a framed opening, closely spaced bars and a latch." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "waiting", "area", "partition", "gate", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#627a7e", { label: 'Asset color' });
const p = assembly("waiting-area-partition-gate");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("left-foot", [210, 330, 48], [-560, 0, 24]);
b("right-foot", [210, 330, 48], [560, 0, 24]);
b("left-post", [65, 72, 930], [-560, 0, 489]);
b("right-post", [65, 72, 930], [560, 0, 489]);
b("top-rail", [1060, 76, 62], [0, 0, 930]);
b("bottom-rail", [1060, 76, 62], [0, 0, 62]);
b("bar-0", [24, 28, 820], [-450, 0, 490]);
b("bar-1", [24, 28, 820], [-350, 0, 490]);
b("bar-2", [24, 28, 820], [-250, 0, 490]);
b("bar-3", [24, 28, 820], [-150, 0, 490]);
b("bar-4", [24, 28, 820], [-50, 0, 490]);
b("bar-5", [24, 28, 820], [50, 0, 490]);
b("bar-6", [24, 28, 820], [150, 0, 490]);
b("bar-7", [24, 28, 820], [250, 0, 490]);
b("bar-8", [24, 28, 820], [350, 0, 490]);
b("bar-9", [24, 28, 820], [450, 0, 490]);
b("latch-body", [86, 35, 120], [510, -55, 650]);

return p.model();
