// Veterinary patient monitor: Bedside monitor with a stable floor stand, display frame and control knob row. Separate tinted glass and displays, powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "multiparameter-monitor",
  license: 'CC0-1.0',
  title: "Veterinary patient monitor",
  description: "Bedside monitor with a stable floor stand, display frame and control knob row. Material controls: tinted glass and displays, powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "patient", "monitor", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#829687', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "screen": return glassColor;
    case "stand-base": return stainlessSteelColor;
    case "stand-column": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("multiparameter-monitor");

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

b("stand-base", [500, 380, 62], [0, 0, 31]);
c("stand-column", 930, 32, 10, [0, 0, 60]);
b("monitor-housing", [490, 92, 380], [0, -20, 1080], [0, -6, 0]);
b("screen", [380, 14, 270], [0, -72, 1100]);
b("lower-control-strip", [440, 18, 58], [0, -70, 880]);
c("control-a", 24, 24, 10, [-145, -84, 884], [1, 0, 0], 90);
c("control-b", 24, 24, 10, [-65, -84, 884], [1, 0, 0], 90);
c("control-c", 24, 24, 10, [15, -84, 884], [1, 0, 0], 90);
c("control-d", 24, 24, 10, [95, -84, 884], [1, 0, 0], 90);
c("control-e", 24, 24, 10, [175, -84, 884], [1, 0, 0], 90);

return p.model();
