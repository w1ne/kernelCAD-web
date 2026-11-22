// Animal restraint loop stand: Freestanding restraint support with a broad weighted foot, upright post and multiple tie points. Separate powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "restraint-loop-stand",
  license: 'CC0-1.0',
  title: "Animal restraint loop stand",
  description: "Freestanding restraint support with a broad weighted foot, upright post and multiple tie points. Material controls: powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "animal", "restraint", "loop", "stand", "low poly", "CC0"],
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
    case "upright-post": return stainlessSteelColor;
    case "cross-arm": return stainlessSteelColor;
    case "end-hook-left": return stainlessSteelColor;
    case "end-hook-right": return stainlessSteelColor;
    case "tie-ring-left": return stainlessSteelColor;
    case "tie-ring-right": return stainlessSteelColor;
    case "height-adjust-clamp": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("restraint-loop-stand");

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

b("weighted-base", [520, 430, 68], [0, 0, 34]);
c("upright-post", 1220, 32, 10, [0, 0, 68]);
b("cross-arm", [520, 50, 55], [0, 0, 1300]);
c("end-hook-left", 125, 14, 8, [-220, -18, 1250], [1, 0, 0], 90);
c("end-hook-right", 125, 14, 8, [220, -18, 1250], [1, 0, 0], 90);
c("tie-ring-left", 16, 40, 10, [-140, -34, 1110]);
c("tie-ring-right", 16, 40, 10, [140, -34, 1110]);
b("height-adjust-clamp", [100, 90, 100], [0, 0, 840]);

return p.model();
