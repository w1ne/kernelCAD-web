// Microscope slide storage cabinet: Compact indexed drawer cabinet with labeled fronts and a raised top lip. Separate powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "slide-storage-cabinet",
  license: 'CC0-1.0',
  title: "Microscope slide storage cabinet",
  description: "Compact indexed drawer cabinet with labeled fronts and a raised top lip. Material controls: powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "microscope", "slide", "storage", "cabinet", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#7d8d96', { label: 'Powder-coated steel' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', stainlessSteelColor: '#8daeb0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "drawer-pull-0": return stainlessSteelColor;
    case "drawer-pull-1": return stainlessSteelColor;
    case "drawer-pull-2": return stainlessSteelColor;
    case "drawer-pull-3": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("slide-storage-cabinet");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("cabinet-body", [570, 440, 690], [0, 0, 345]);
b("top-cap", [610, 470, 45], [0, 0, 712]);
b("drawer-0", [520, 32, 110], [0, -230, 610]);
b("drawer-1", [520, 32, 110], [0, -230, 465]);
b("drawer-2", [520, 32, 110], [0, -230, 320]);
b("drawer-3", [520, 32, 110], [0, -230, 175]);
b("drawer-pull-0", [110, 25, 22], [0, -255, 610]);
b("drawer-pull-1", [110, 25, 22], [0, -255, 465]);
b("drawer-pull-2", [110, 25, 22], [0, -255, 320]);
b("drawer-pull-3", [110, 25, 22], [0, -255, 175]);
b("label-strip", [190, 12, 34], [170, -258, 610]);

return p.model();
