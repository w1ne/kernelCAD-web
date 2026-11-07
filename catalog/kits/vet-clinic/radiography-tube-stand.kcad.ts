// Veterinary radiography tube stand: Mobile stand with an upright column, reach arm, counterweight and compact tube head. Separate tinted glass and displays, powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "radiography-tube-stand",
  license: 'CC0-1.0',
  title: "Veterinary radiography tube stand",
  description: "Mobile stand with an upright column, reach arm, counterweight and compact tube head. Material controls: tinted glass and displays, powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "radiography", "tube", "stand", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#66838a', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "tube-face": return glassColor;
    case "base-foot-n": return rubberColor;
    case "base-foot-e": return rubberColor;
    case "wheel-a": return rubberColor;
    case "wheel-b": return rubberColor;
    case "column": return stainlessSteelColor;
    case "reach-arm": return stainlessSteelColor;
    case "counterweight": return stainlessSteelColor;
    case "handle": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("radiography-tube-stand");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};
const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = cylinder(h, r, segments);
  if (axis && degrees) shape = shape.rotate(axis, degrees);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("base-foot-n", [570, 70, 65], [0, 0, 34]);
b("base-foot-e", [70, 480, 65], [0, 0, 34]);
c("wheel-a", 42, 48, 8, [-245, -190, 48], [1, 0, 0], 90);
c("wheel-b", 42, 48, 8, [245, -190, 48], [1, 0, 0], 90);
c("column", 1420, 48, 12, [0, 0, 63]);
b("reach-arm", [700, 62, 62], [220, 0, 1333]);
b("counterweight", [170, 150, 190], [-75, 0, 1278]);
b("tube-head", [310, 260, 230], [610, 0, 1183]);
c("tube-face", 24, 92, 12, [610, -138, 1183], [1, 0, 0], 90);
b("handle", [240, 40, 45], [360, -45, 1238]);

return p.model();
