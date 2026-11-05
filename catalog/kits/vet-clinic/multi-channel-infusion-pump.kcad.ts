// Multi-channel infusion pump stand: Treatment stand carrying two compact infusion pump modules below a multi-hook rail. Separate powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "multi-channel-infusion-pump",
  license: 'CC0-1.0',
  title: "Multi-channel infusion pump stand",
  description: "Treatment stand carrying two compact infusion pump modules below a multi-hook rail. Material controls: powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "multi-channel", "infusion", "pump", "stand", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#7d8d96', { label: 'Powder-coated steel' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', rubberColor: '#34464a' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "caster-a": return rubberColor;
    case "caster-b": return rubberColor;
    case "base-spoke-x": return stainlessSteelColor;
    case "base-spoke-y": return stainlessSteelColor;
    case "hook-bar": return stainlessSteelColor;
    case "hook-left": return stainlessSteelColor;
    case "hook-right": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("multi-channel-infusion-pump");

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

b("base-spoke-x", [520, 65, 46], [0, 0, 27]);
b("base-spoke-y", [65, 460, 46], [0, 0, 27]);
c("caster-a", 28, 34, 8, [-215, -180, 0]);
c("caster-b", 28, 34, 8, [215, -180, 0]);
c("upright", 1320, 30, 10, [0, 0, 55]);
b("pump-upper", [260, 170, 210], [0, -28, 965]);
b("pump-lower", [260, 170, 210], [0, -28, 710]);
b("pump-face-upper", [205, 12, 115], [0, -120, 985]);
b("pump-face-lower", [205, 12, 115], [0, -120, 730]);
b("hook-bar", [430, 40, 42], [0, 0, 1375]);
c("hook-left", 90, 12, 8, [-150, -20, 1325], [1, 0, 0], 90);
c("hook-right", 90, 12, 8, [150, -20, 1325], [1, 0, 0], 90);

return p.model();
