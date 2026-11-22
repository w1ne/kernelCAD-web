// Veterinary floor scale: Low platform scale with a raised readout post for weighing small and medium animals. Separate tinted glass and displays, powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "pet-floor-scale",
  license: 'CC0-1.0',
  title: "Veterinary floor scale",
  description: "Low platform scale with a raised readout post for weighing small and medium animals. Material controls: tinted glass and displays, powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "floor", "scale", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#829687', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "display-housing": return glassColor;
    case "display-face": return glassColor;
    case "foot-a": return rubberColor;
    case "foot-b": return rubberColor;
    case "foot-c": return rubberColor;
    case "foot-d": return rubberColor;
    case "readout-post": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("pet-floor-scale");

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

b("weighing-platform", [540, 520, 64], [0, 0, 44]);
c("foot-a", 34, 34, 8, [-210, -190, 0]);
c("foot-b", 34, 34, 8, [210, -190, 0]);
c("foot-c", 34, 34, 8, [-210, 190, 0]);
c("foot-d", 34, 34, 8, [210, 190, 0]);
c("readout-post", 510, 20, 10, [-170, 220, 52]);
b("display-housing", [170, 70, 115], [-170, 220, 598], [0, 12, 0]);
b("display-face", [125, 10, 52], [-170, 178, 608]);

return p.model();
