// Veterinary patient warming cabinet: Mobile warming cabinet with paired doors, interior shelves and a top-mounted control panel. Separate powder-coated steel, rubber surfaces keep its component silhouette readable.
meta({
  name: "warming-cabinet",
  license: 'CC0-1.0',
  title: "Veterinary patient warming cabinet",
  description: "Mobile warming cabinet with paired doors, interior shelves and a top-mounted control panel. Material controls: powder-coated steel, rubber. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "patient", "warming", "cabinet", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#6e8994', { label: 'Powder-coated steel' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', rubberColor: '#34464a' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "caster-a": return rubberColor;
    case "caster-b": return rubberColor;
  }
  return paintedSteelColor;
};
const p = assembly("warming-cabinet");

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

b("cabinet-shell", [760, 640, 1040], [0, 0, 520]);
b("left-door", [355, 45, 820], [-190, -342, 520]);
b("right-door", [355, 45, 820], [190, -342, 520]);
b("center-seam", [24, 52, 850], [0, -368, 520]);
b("shelf-one", [670, 500, 36], [0, 0, 360]);
b("shelf-two", [670, 500, 36], [0, 0, 650]);
b("control-panel", [230, 80, 150], [0, -360, 1100]);
c("caster-a", 36, 45, 8, [-300, -235, 22]);
c("caster-b", 36, 45, 8, [300, -235, 22]);

return p.model();
