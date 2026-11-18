// Veterinary grooming dryer stand: Mobile forced-air dryer stand with a weighted base, adjustable boom and shaped outlet nozzle. Separate powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "high-velocity-dryer-stand",
  license: 'CC0-1.0',
  title: "Veterinary grooming dryer stand",
  description: "Mobile forced-air dryer stand with a weighted base, adjustable boom and shaped outlet nozzle. Material controls: powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "grooming", "dryer", "stand", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#6e8994', { label: 'Powder-coated steel' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', rubberColor: '#34464a' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "base-foot-x": return rubberColor;
    case "base-foot-y": return rubberColor;
    case "caster-a": return rubberColor;
    case "caster-b": return rubberColor;
    case "mast": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("high-velocity-dryer-stand");

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

b("base-foot-x", [560, 80, 54], [0, 0, 27]);
b("base-foot-y", [80, 480, 54], [0, 0, 27]);
c("caster-a", 30, 36, 8, [-230, -185, 2]);
c("caster-b", 30, 36, 8, [230, -185, 2]);
c("mast", 1040, 36, 10, [0, 0, 55]);
b("dryer-housing", [420, 360, 410], [0, 0, 865]);
b("control-panel", [220, 24, 175], [80, -188, 885]);
b("boom", [530, 42, 42], [240, 45, 1105], [0, 0, 12]);
c("hose-segment-a", 330, 30, 10, [505, 75, 1095], [0, 1, 0], 85);
c("hose-segment-b", 240, 28, 10, [645, 70, 1015], [0, 1, 0], 72);
c("air-nozzle", 190, 58, 10, [760, 68, 925], [0, 1, 0], 72);

return p.model();
