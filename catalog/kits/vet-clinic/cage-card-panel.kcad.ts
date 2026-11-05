// Kennel card panel: Clip-on kennel identification board with multiple card pockets and reinforced top and bottom rails. Separate powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "cage-card-panel",
  license: 'CC0-1.0',
  title: "Kennel card panel",
  description: "Clip-on kennel identification board with multiple card pockets and reinforced top and bottom rails. Material controls: powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "kennel", "card", "panel", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#66838a', { label: 'Powder-coated steel' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', stainlessSteelColor: '#8daeb0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "top-rail": return stainlessSteelColor;
    case "bottom-rail": return stainlessSteelColor;
    case "mount-bracket-left": return stainlessSteelColor;
    case "mount-bracket-right": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("cage-card-panel");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("panel", [1040, 46, 620], [0, 0, 310]);
b("top-rail", [1100, 62, 42], [0, 0, 625]);
b("bottom-rail", [1100, 62, 42], [0, 0, 21]);
b("card-pocket-0", [420, 28, 122], [0, -34, 525]);
b("card-pocket-1", [420, 28, 122], [0, -34, 380]);
b("card-pocket-2", [420, 28, 122], [0, -34, 235]);
b("card-pocket-3", [420, 28, 122], [0, -34, 90]);
b("clip-0", [100, 22, 24], [0, -54, 577]);
b("clip-1", [100, 22, 24], [0, -54, 432]);
b("clip-2", [100, 22, 24], [0, -54, 287]);
b("clip-3", [100, 22, 24], [0, -54, 142]);
b("mount-bracket-left", [110, 80, 90], [-450, 46, 620]);
b("mount-bracket-right", [110, 80, 90], [450, 46, 620]);

return p.model();
