// Mobile ultrasound cart: Compact imaging cart with a console, angled display, probe cups and twin rear handles. Separate tinted glass and displays, powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "mobile-ultrasound-cart",
  license: 'CC0-1.0',
  title: "Mobile ultrasound cart",
  description: "Compact imaging cart with a console, angled display, probe cups and twin rear handles. Material controls: tinted glass and displays, powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "mobile", "ultrasound", "cart", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#829687', { label: 'Powder-coated steel' });
const glassColor = param('glassColor', '#4e8290', { label: 'Tinted glass and displays' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', glassColor: '#3f7480' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "display": return glassColor;
    case "wheel-left": return rubberColor;
    case "wheel-right": return rubberColor;
    case "column": return stainlessSteelColor;
    case "left-handle": return stainlessSteelColor;
    case "right-handle": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("mobile-ultrasound-cart");

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

b("base-platform", [590, 470, 80], [0, 0, 200]);
c("wheel-left", 42, 55, 10, [-220, 0, 55], [1, 0, 0], 90);
c("wheel-right", 42, 55, 10, [220, 0, 55], [1, 0, 0], 90);
c("column", 530, 42, 12, [0, 0, 240]);
b("console-body", [510, 410, 260], [0, 0, 650]);
b("control-panel", [370, 18, 130], [0, -214, 730], [0, -10, 0]);
b("display", [390, 42, 280], [0, 20, 925], [0, -12, 0]);
b("left-handle", [46, 56, 240], [-285, 140, 620]);
b("right-handle", [46, 56, 240], [285, 140, 620]);
c("probe-cup-a", 100, 46, 10, [-200, -180, 545]);
c("probe-cup-b", 100, 46, 10, [200, -180, 545]);

return p.model();
