// Appointment status display: Reception display with a floor stand, wide screen housing and angled viewing face. Separate tinted glass and displays, powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "appointment-status-display",
  license: 'CC0-1.0',
  title: "Appointment status display",
  description: "Reception display with a floor stand, wide screen housing and angled viewing face. Material controls: tinted glass and displays, powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "appointment", "status", "display", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#8e9991', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "screen-housing": return glassColor;
    case "screen-panel": return glassColor;
    case "status-beacon": return glassColor;
    case "stand-column": return stainlessSteelColor;
    case "service-slot": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("appointment-status-display");

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

b("base", [430, 300, 55], [0, 0, 27.5]);
c("stand-column", 680, 38, 12, [0, 0, 54.5]);
b("screen-housing", [620, 78, 390], [0, 0, 849.5], [0, -8, 0]);
b("screen-panel", [520, 10, 285], [0, -46, 849.5]);
b("service-slot", [130, 18, 35], [0, -48, 674.5]);
c("status-beacon", 50, 28, 10, [250, 0, 1069.5]);

return p.model();
