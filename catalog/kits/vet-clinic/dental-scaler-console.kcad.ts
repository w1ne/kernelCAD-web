// Dental scaler console: Compact scaler console with sloped control face, handpiece sockets and foot pedal. Separate powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "dental-scaler-console",
  license: 'CC0-1.0',
  title: "Dental scaler console",
  description: "Compact scaler console with sloped control face, handpiece sockets and foot pedal. Material controls: powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "dental", "scaler", "console", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#8e9991', { label: 'Powder-coated steel' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', rubberColor: '#34464a' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "foot-pedal": return rubberColor;
    case "cable-post": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("dental-scaler-console");

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

b("console-base", [430, 330, 88], [0, 0, 44]);
b("console-body", [380, 300, 310], [0, 0, 241]);
b("top-panel", [350, 190, 34], [0, -40, 404], [15, 0, 0]);
c("dial-one", 22, 30, 10, [-100, -145, 419], [1, 0, 0], 90);
c("dial-two", 22, 30, 10, [0, -145, 419], [1, 0, 0], 90);
c("dial-three", 22, 30, 10, [100, -145, 419], [1, 0, 0], 90);
b("handpiece-rack", [260, 100, 45], [0, 130, 429]);
b("foot-pedal", [180, 240, 60], [0, -300, 59], [12, 0, 0]);
c("cable-post", 160, 12, 8, [210, 0, 129]);

return p.model();
