// Mobile examination light: Adjustable lamp head on a weighted mobile base with a tall mast and offset arm. Separate powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "mobile-exam-light",
  license: 'CC0-1.0',
  title: "Mobile examination light",
  description: "Adjustable lamp head on a weighted mobile base with a tall mast and offset arm. Material controls: powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "mobile", "examination", "light", "low poly", "CC0"],
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
    case "base-foot-a": return rubberColor;
    case "base-foot-b": return rubberColor;
    case "caster-a": return rubberColor;
    case "caster-b": return rubberColor;
    case "mast": return stainlessSteelColor;
    case "upper-arm": return stainlessSteelColor;
    case "head-yoke": return stainlessSteelColor;
    case "lamp-handle": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("mobile-exam-light");

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

c("base-disc", 45, 270, 12, [0, 0, 26]);
b("base-foot-a", [380, 70, 50], [0, 0, 25]);
b("base-foot-b", [380, 70, 50], [0, 0, 25], [0, 0, 90]);
c("caster-a", 32, 34, 8, [-185, -185, 16]);
c("caster-b", 32, 34, 8, [185, -185, 16]);
c("mast", 1470, 32, 10, [0, 0, 50]);
c("joint-a", 120, 26, 10, [0, 0, 1390], [0, 1, 0], 90);
b("upper-arm", [460, 42, 42], [220, 0, 1420]);
c("head-yoke", 75, 28, 10, [450, 0, 1400]);
c("lamp-head", 90, 175, 12, [450, 0, 1295]);
b("lamp-handle", [30, 170, 34], [450, -175, 1200]);

return p.model();
