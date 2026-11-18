// Examination room wall station: Wall panel with organized tool hooks, glove box, dispenser and a shallow utility shelf. Separate powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "exam-wall-station",
  license: 'CC0-1.0',
  title: "Examination room wall station",
  description: "Wall panel with organized tool hooks, glove box, dispenser and a shallow utility shelf. Material controls: powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "examination", "room", "wall", "station", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#829687', { label: 'Powder-coated steel' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', stainlessSteelColor: '#8daeb0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "lower-rail": return stainlessSteelColor;
    case "tool-hook-a": return stainlessSteelColor;
    case "tool-hook-b": return stainlessSteelColor;
    case "tool-hook-c": return stainlessSteelColor;
    case "tool-hook-d": return stainlessSteelColor;
    case "tool-hook-e": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("exam-wall-station");

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

b("backplate", [800, 72, 780], [0, 0, 390]);
b("upper-shelf", [740, 190, 42], [0, -75, 765]);
b("glove-box", [240, 170, 210], [-220, -125, 590]);
b("dispenser", [170, 120, 280], [245, -130, 560]);
b("lower-rail", [690, 48, 40], [0, -55, 120]);
c("tool-hook-a", 115, 12, 8, [-280, -85, 290], [1, 0, 0], 90);
c("tool-hook-b", 115, 12, 8, [-140, -85, 290], [1, 0, 0], 90);
c("tool-hook-c", 115, 12, 8, [0, -85, 290], [1, 0, 0], 90);
c("tool-hook-d", 115, 12, 8, [140, -85, 290], [1, 0, 0], 90);
c("tool-hook-e", 115, 12, 8, [280, -85, 290], [1, 0, 0], 90);

return p.model();
