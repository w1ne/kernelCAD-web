// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "chemistry-analyzer",
  license: 'CC0-1.0',
  title: "Veterinary chemistry analyzer",
  description: "Bench analyzer with a reagent lid, sample carousel, front access bay and status display." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "chemistry", "analyzer", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#718388", { label: 'Asset color' });
const p = assembly("chemistry-analyzer");

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

b("analyzer-base", [640, 520, 92], [0, 0, 46]);
b("main-housing", [600, 500, 390], [0, 0, 285]);
b("reagent-cover", [440, 300, 70], [50, 50, 515], [0, -5, 0]);
b("sample-tray", [300, 230, 40], [-155, -110, 505]);
c("sample-cup-0", 78, 23, 8, [-245, -160, 560]);
c("sample-cup-1", 78, 23, 8, [-187, -160, 560]);
c("sample-cup-2", 78, 23, 8, [-129, -160, 560]);
c("sample-cup-3", 78, 23, 8, [-71, -160, 560]);
b("display-frame", [220, 26, 155], [170, -255, 385]);
b("sample-door", [300, 26, 110], [-255, 230, 455]);

return p.model();
