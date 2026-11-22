// Veterinary radiography table: Low imaging table with a floating-style top, under-table carriage and four braced legs. Separate molded polymer, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "veterinary-radiography-table",
  license: 'CC0-1.0',
  title: "Veterinary radiography table",
  description: "Low imaging table with a floating-style top, under-table carriage and four braced legs. Material controls: molded polymer, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "radiography", "table", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });
const polymerColor = param('polymerColor', '#d3dfdc', { label: 'Molded polymer' });

presets({
  clinicClean: { stainlessSteelColor: '#e1e6e3' },
  softTeal: { stainlessSteelColor: '#8daeb0', polymerColor: '#9bbfc0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "imaging-top": return polymerColor;
  }
  return stainlessSteelColor;
};
const p = assembly("veterinary-radiography-table");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("imaging-top", [1480, 680, 72], [0, 0, 850]);
b("under-table-carriage", [740, 400, 110], [0, 0, 755]);
b("left-leg", [70, 70, 730], [-620, -255, 365]);
b("right-leg", [70, 70, 730], [620, -255, 365]);
b("rear-left-leg", [70, 70, 730], [-620, 255, 365]);
b("rear-right-leg", [70, 70, 730], [620, 255, 365]);
b("lower-crossbar-front", [1120, 48, 44], [0, -255, 155]);
b("lower-crossbar-back", [1120, 48, 44], [0, 255, 155]);
b("side-rail-left", [38, 610, 56], [-750, 0, 918]);
b("side-rail-right", [38, 610, 56], [750, 0, 918]);

return p.model();
