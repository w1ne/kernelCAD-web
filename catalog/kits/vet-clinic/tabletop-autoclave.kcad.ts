// Tabletop instrument sterilizer: Bench-top sterilizer with a front chamber door, latch and a small control panel. Separate powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "tabletop-autoclave",
  license: 'CC0-1.0',
  title: "Tabletop instrument sterilizer",
  description: "Bench-top sterilizer with a front chamber door, latch and a small control panel. Material controls: powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "tabletop", "instrument", "sterilizer", "low poly", "CC0"],
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
    case "lower-foot-left": return rubberColor;
    case "lower-foot-right": return rubberColor;
    case "door-handle-left": return stainlessSteelColor;
    case "door-handle-right": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("tabletop-autoclave");

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

b("body", [650, 530, 560], [0, 0, 280]);
b("lower-foot-left", [100, 420, 46], [-220, 0, 23]);
b("lower-foot-right", [100, 420, 46], [220, 0, 23]);
c("chamber-door", 34, 185, 12, [0, -284, 300], [1, 0, 0], 90);
c("door-handle-left", 110, 15, 8, [-245, -305, 300], [1, 0, 0], 90);
c("door-handle-right", 110, 15, 8, [245, -305, 300], [1, 0, 0], 90);
b("control-panel", [190, 38, 260], [235, -280, 410]);
c("control-knob", 24, 28, 10, [235, -304, 360], [1, 0, 0], 90);
b("top-vent", [380, 260, 32], [0, 30, 565]);

return p.model();
