// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "hematology-analyzer",
  license: 'CC0-1.0',
  title: "Veterinary hematology analyzer",
  description: "Compact blood-cell analyzer with a front sample loader and raised reagent bay." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "hematology", "analyzer", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#62787f", { label: 'Asset color' });
const p = assembly("hematology-analyzer");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("base", [620, 520, 86], [0, 0, 43]);
b("housing", [600, 500, 380], [0, 0, 276]);
b("reagent-bay", [260, 270, 220], [155, 80, 576]);
b("loader-platform", [280, 200, 46], [-155, -180, 500]);
b("sample-tube-a", [46, 46, 110], [-225, -180, 578]);
b("sample-tube-b", [46, 46, 110], [-155, -180, 578]);
b("front-display", [230, 18, 125], [120, -255, 390]);
b("service-door", [330, 24, 110], [-155, -252, 180]);

return p.model();
