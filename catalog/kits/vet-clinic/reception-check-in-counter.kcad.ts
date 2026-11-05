// Veterinary check-in counter: Reception counter with a client ledge, staff work surface, monitor and keyboard. Separate tinted glass and displays, powder-coated steel, molded polymer, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "reception-check-in-counter",
  license: 'CC0-1.0',
  title: "Veterinary check-in counter",
  description: "Reception counter with a client ledge, staff work surface, monitor and keyboard. Material controls: tinted glass and displays, powder-coated steel, molded polymer, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "check-in", "counter", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#8e9991', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const polymerColor = param('polymerColor', '#d3dfdc', { label: 'Molded polymer' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "privacy-screen": return glassColor;
    case "transaction-counter": return polymerColor;
    case "keyboard": return polymerColor;
    case "monitor-base": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("reception-check-in-counter");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("front-plinth", [1600, 580, 730], [0, 0, 365]);
b("transaction-counter", [1750, 720, 80], [0, 0, 770]);
b("privacy-screen", [1580, 42, 240], [0, 270, 930]);
b("monitor-base", [210, 150, 24], [-30, -176, 825]);
b("monitor-housing", [320, 54, 220], [-30, -202, 940]);
b("keyboard", [340, 150, 18], [300, -160, 822]);
b("drawer-front", [440, 22, 90], [-500, -302, 645]);

return p.model();
