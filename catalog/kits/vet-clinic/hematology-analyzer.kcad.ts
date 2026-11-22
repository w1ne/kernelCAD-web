// Veterinary hematology analyzer: Compact blood-cell analyzer with a front sample loader and raised reagent bay. Separate tinted glass and displays, powder-coated steel surfaces keep its component silhouette readable.
meta({
  name: "hematology-analyzer",
  license: 'CC0-1.0',
  title: "Veterinary hematology analyzer",
  description: "Compact blood-cell analyzer with a front sample loader and raised reagent bay. Material controls: tinted glass and displays, powder-coated steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "hematology", "analyzer", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#6e8994', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "front-display": return glassColor;
  }
  return paintedSteelColor;
};
const p = assembly("hematology-analyzer");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
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
