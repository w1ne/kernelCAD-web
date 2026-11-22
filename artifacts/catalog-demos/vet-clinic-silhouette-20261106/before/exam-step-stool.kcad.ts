// Veterinary exam step stool: Two-tier non-slip step stool with a broad base and side support panels. Separate powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "exam-step-stool",
  license: 'CC0-1.0',
  title: "Veterinary exam step stool",
  description: "Two-tier non-slip step stool with a broad base and side support panels. Material controls: powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "exam", "step", "stool", "low poly", "CC0"],
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
    case "base-foot-left": return rubberColor;
    case "base-foot-right": return rubberColor;
    case "left-support": return stainlessSteelColor;
    case "right-support": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("exam-step-stool");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(finishFor(name)));
};

b("lower-tread", [600, 450, 75], [0, -65, 155]);
b("upper-tread", [440, 360, 75], [0, 95, 345]);
b("left-support", [80, 430, 360], [-250, 0, 190]);
b("right-support", [80, 430, 360], [250, 0, 190]);
b("front-riser", [520, 55, 170], [0, -220, 105]);
b("upper-riser", [400, 50, 185], [0, -96, 255]);
b("base-foot-left", [90, 480, 28], [-270, 0, 14]);
b("base-foot-right", [90, 480, 28], [270, 0, 14]);

return p.model();
