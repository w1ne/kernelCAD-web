// Veterinary exam stool: Compact wheeled clinician stool with a circular seat, adjustable post and foot ring. Separate powder-coated steel, rubber, stainless steel, vinyl upholstery surfaces keep its component silhouette readable.
meta({
  name: "veterinary-exam-stool",
  license: 'CC0-1.0',
  title: "Veterinary exam stool",
  description: "Compact wheeled clinician stool with a circular seat, adjustable post and foot ring. Material controls: powder-coated steel, rubber, stainless steel, vinyl upholstery. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "exam", "stool", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#829687', { label: 'Powder-coated steel' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });
const upholsteryColor = param('upholsteryColor', '#62858a', { label: 'Vinyl upholstery' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', rubberColor: '#34464a' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "foot-ring": return rubberColor;
    case "caster-a": return rubberColor;
    case "caster-b": return rubberColor;
    case "caster-c": return rubberColor;
    case "caster-d": return rubberColor;
    case "base-spoke-s": return stainlessSteelColor;
    case "seat": return upholsteryColor;
    case "seat-post": return upholsteryColor;
  }
  return paintedSteelColor;
};
const p = assembly("veterinary-exam-stool");

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

c("seat", 70, 230, 12, [0, 0, 554]);
c("seat-post", 480, 34, 12, [0, 0, 64]);
c("foot-ring", 24, 155, 12, [0, 0, 229]);
b("base-spoke-n", [420, 54, 42], [0, 0, 44]);
b("base-spoke-s", [420, 54, 42], [0, 0, 44], [0, 0, 90]);
c("caster-a", 30, 30, 8, [-185, 0, 0]);
c("caster-b", 30, 30, 8, [185, 0, 0]);
c("caster-c", 30, 30, 8, [0, -185, 0]);
c("caster-d", 30, 30, 8, [0, 185, 0]);

return p.model();
