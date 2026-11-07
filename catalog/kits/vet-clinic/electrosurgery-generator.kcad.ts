// Electrosurgery generator cart: Compact generator on a cart with a display face, output sockets and accessory hooks. Separate tinted glass and displays, powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "electrosurgery-generator",
  license: 'CC0-1.0',
  title: "Electrosurgery generator cart",
  description: "Compact generator on a cart with a display face, output sockets and accessory hooks. Material controls: tinted glass and displays, powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "electrosurgery", "generator", "cart", "low poly", "CC0"],
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
    case "display-frame": return glassColor;
    case "caster-a": return rubberColor;
    case "caster-b": return rubberColor;
    case "foot-pedal": return rubberColor;
    case "column": return stainlessSteelColor;
    case "accessory-hook-left": return stainlessSteelColor;
    case "accessory-hook-right": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("electrosurgery-generator");

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

b("cart-base", [470, 350, 72], [0, 0, 150]);
c("caster-a", 30, 36, 8, [-185, -125, 18]);
c("caster-b", 30, 36, 8, [185, -125, 18]);
c("column", 500, 30, 10, [0, 0, 0]);
b("generator-body", [470, 340, 300], [0, 0, 580]);
b("display-frame", [230, 18, 120], [-100, -178, 625]);
b("output-panel", [430, 24, 70], [0, -180, 430]);
c("socket-left", 22, 28, 10, [-130, -200, 430], [1, 0, 0], 90);
c("socket-right", 22, 28, 10, [130, -200, 430], [1, 0, 0], 90);
b("accessory-hook-left", [30, 130, 35], [-260, 80, 750]);
b("accessory-hook-right", [30, 130, 35], [260, 80, 750]);
b("foot-pedal", [180, 240, 52], [0, -265, 45], [8, 0, 0]);

return p.model();
