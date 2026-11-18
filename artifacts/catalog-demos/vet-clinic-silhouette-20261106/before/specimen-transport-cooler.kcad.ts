// Specimen transport cooler: Insulated specimen case with a clamped lid, carry handle and temperature indicator. Separate tinted glass and displays, molded polymer, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "specimen-transport-cooler",
  license: 'CC0-1.0',
  title: "Specimen transport cooler",
  description: "Insulated specimen case with a clamped lid, carry handle and temperature indicator. Material controls: tinted glass and displays, molded polymer, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "specimen", "transport", "cooler", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymerColor = param('polymerColor', '#d3dfdc', { label: 'Molded polymer' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { polymerColor: '#e8ece8' },
  softTeal: { polymerColor: '#9bbfc0', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "temperature-window": return glassColor;
    case "carry-grip": return rubberColor;
    case "side-grip-left": return rubberColor;
    case "side-grip-right": return rubberColor;
    case "lid-rim": return stainlessSteelColor;
    case "handle-left": return stainlessSteelColor;
    case "handle-right": return stainlessSteelColor;
    case "latch-front": return stainlessSteelColor;
  }
  return polymerColor;
};
const p = assembly("specimen-transport-cooler");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("cooler-body", [520, 430, 430], [0, 0, 215]);
b("lid", [560, 470, 75], [0, 0, 467]);
b("lid-rim", [490, 400, 34], [0, 0, 517]);
b("handle-left", [38, 220, 42], [-125, 0, 575]);
b("handle-right", [38, 220, 42], [125, 0, 575]);
b("carry-grip", [290, 52, 44], [0, 0, 605]);
b("latch-front", [78, 35, 118], [0, -226, 435]);
b("temperature-window", [135, 20, 78], [130, -223, 275]);
b("side-grip-left", [130, 44, 62], [-282, 0, 285]);
b("side-grip-right", [130, 44, 62], [282, 0, 285]);

return p.model();
