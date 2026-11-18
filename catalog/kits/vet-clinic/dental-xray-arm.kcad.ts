// Veterinary dental X-ray arm: Wall-mounted articulated imaging arm with two pivots and a compact sensor head. Separate powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "dental-xray-arm",
  license: 'CC0-1.0',
  title: "Veterinary dental X-ray arm",
  description: "Wall-mounted articulated imaging arm with two pivots and a compact sensor head. Material controls: powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "dental", "x-ray", "arm", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "wall",
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
    case "pivot-lower": return stainlessSteelColor;
    case "arm-one": return stainlessSteelColor;
    case "pivot-upper": return stainlessSteelColor;
    case "arm-two": return stainlessSteelColor;
    case "handle": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("dental-xray-arm");

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

b("wall-plate", [280, 70, 380], [0, 0, 390]);
c("pivot-lower", 62, 70, 12, [0, -58, 520], [1, 0, 0], 90);
b("arm-one", [530, 56, 56], [240, -70, 530], [0, 0, -18]);
c("pivot-upper", 70, 52, 10, [470, -145, 610], [1, 0, 0], 90);
b("arm-two", [390, 48, 48], [650, -175, 610], [0, 0, 16]);
c("sensor-head", 160, 88, 10, [820, -215, 590], [1, 0, 0], 90);
b("collimator", [100, 78, 70], [820, -260, 590]);
b("handle", [180, 32, 30], [705, -210, 670]);

return p.model();
