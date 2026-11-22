// Veterinary fluid warmer: Counter-top fluid warmer with an insulated housing, front access slot and control panel. Separate tinted glass and displays, powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "fluid-warmer",
  license: 'CC0-1.0',
  title: "Veterinary fluid warmer",
  description: "Counter-top fluid warmer with an insulated housing, front access slot and control panel. Material controls: tinted glass and displays, powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "fluid", "warmer", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#718b89', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "door-window": return glassColor;
    case "handle": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("fluid-warmer");

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

b("housing", [420, 360, 510], [0, 0, 255]);
b("front-door", [330, 34, 340], [0, -200, 260]);
b("door-window", [210, 10, 190], [0, -222, 300]);
b("control-panel", [110, 38, 230], [165, -201, 380]);
c("temperature-knob", 22, 25, 10, [165, -226, 360], [1, 0, 0], 90);
b("top-lid", [450, 390, 34], [0, 0, 520]);
b("handle", [160, 40, 30], [0, -10, 555]);
b("power-base", [370, 300, 38], [0, 0, 19]);

return p.model();
