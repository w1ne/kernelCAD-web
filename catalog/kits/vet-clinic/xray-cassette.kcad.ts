// Radiography cassette: Flat protective cassette with reinforced perimeter rails and a small pull handle. Separate powder-coated steel, molded polymer, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "xray-cassette",
  license: 'CC0-1.0',
  title: "Radiography cassette",
  description: "Flat protective cassette with reinforced perimeter rails and a small pull handle. Material controls: powder-coated steel, molded polymer, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "radiography", "cassette", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#718b89', { label: 'Powder-coated steel' });
const polymerColor = param('polymerColor', '#d3dfdc', { label: 'Molded polymer' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', polymerColor: '#9bbfc0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "label-tab": return polymerColor;
    case "edge-left": return stainlessSteelColor;
    case "edge-right": return stainlessSteelColor;
    case "edge-front": return stainlessSteelColor;
    case "edge-back": return stainlessSteelColor;
    case "pull-handle": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("xray-cassette");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("cassette-body", [430, 520, 34], [0, 0, 17]);
b("edge-left", [22, 520, 44], [-204, 0, 23]);
b("edge-right", [22, 520, 44], [204, 0, 23]);
b("edge-front", [430, 22, 44], [0, -250, 23]);
b("edge-back", [430, 22, 44], [0, 250, 23]);
b("pull-handle", [115, 28, 32], [0, -287, 25]);
b("label-tab", [96, 42, 22], [150, 210, 45]);

return p.model();
