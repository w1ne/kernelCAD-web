// Veterinary urinalysis analyzer: Small urine analyzer with a strip insertion slot, sample rack and compact angled display. Separate tinted glass and displays, powder-coated steel surfaces keep its component silhouette readable.
meta({
  name: "urinalysis-analyzer",
  license: 'CC0-1.0',
  title: "Veterinary urinalysis analyzer",
  description: "Small urine analyzer with a strip insertion slot, sample rack and compact angled display. Material controls: tinted glass and displays, powder-coated steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "urinalysis", "analyzer", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#66838a', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "display": return glassColor;
  }
  return paintedSteelColor;
};
const p = assembly("urinalysis-analyzer");

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

b("base", [460, 380, 70], [0, 0, 35]);
b("body", [430, 350, 280], [0, 0, 210]);
b("lid", [360, 270, 55], [0, 0, 378]);
b("display", [195, 32, 140], [110, -180, 320], [0, -8, 0]);
b("strip-slot", [150, 18, 32], [-90, -184, 235]);
b("sample-rack", [250, 160, 46], [0, 200, 338]);
c("sample-position-0", 55, 20, 8, [-75, 210, 380]);
c("sample-position-1", 55, 20, 8, [-25, 210, 380]);
c("sample-position-2", 55, 20, 8, [25, 210, 380]);
c("sample-position-3", 55, 20, 8, [75, 210, 380]);

return p.model();
