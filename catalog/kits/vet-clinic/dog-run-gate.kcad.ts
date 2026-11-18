// Veterinary dog-run gate: Full-height run gate with a framed swing panel, upright bars and a secure latch. Separate powder-coated steel, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "dog-run-gate",
  license: 'CC0-1.0',
  title: "Veterinary dog-run gate",
  description: "Full-height run gate with a framed swing panel, upright bars and a secure latch. Material controls: powder-coated steel, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "dog-run", "gate", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteelColor = param('paintedSteelColor', '#6e8994', { label: 'Powder-coated steel' });
const stainlessSteelColor = param('stainlessSteelColor', '#bdc7c5', { label: 'Stainless steel' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7' },
  softTeal: { paintedSteelColor: '#4d858d', stainlessSteelColor: '#8daeb0' },
});

const finishFor = (name: string) => {
  switch (name) {
    case "left-post": return stainlessSteelColor;
    case "right-post": return stainlessSteelColor;
    case "gate-bar-0": return stainlessSteelColor;
    case "gate-bar-1": return stainlessSteelColor;
    case "gate-bar-2": return stainlessSteelColor;
    case "gate-bar-3": return stainlessSteelColor;
    case "gate-bar-4": return stainlessSteelColor;
    case "gate-bar-5": return stainlessSteelColor;
    case "gate-bar-6": return stainlessSteelColor;
    case "gate-bar-7": return stainlessSteelColor;
    case "gate-bar-8": return stainlessSteelColor;
    case "latch-plate": return stainlessSteelColor;
    case "hinge-upper": return stainlessSteelColor;
    case "hinge-lower": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("dog-run-gate");

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

b("left-foot", [270, 430, 55], [-720, 0, 27.5]);
b("right-foot", [270, 430, 55], [720, 0, 27.5]);
b("left-post", [72, 84, 1500], [-720, 0, 777.5]);
b("right-post", [72, 84, 1500], [720, 0, 777.5]);
b("gate-top", [1380, 65, 72], [0, 0, 1489.5]);
b("gate-bottom", [1380, 65, 72], [0, 0, 79.5]);
b("gate-bar-0", [25, 30, 1330], [-620, 0, 779.5]);
b("gate-bar-1", [25, 30, 1330], [-465, 0, 779.5]);
b("gate-bar-2", [25, 30, 1330], [-310, 0, 779.5]);
b("gate-bar-3", [25, 30, 1330], [-155, 0, 779.5]);
b("gate-bar-4", [25, 30, 1330], [0, 0, 779.5]);
b("gate-bar-5", [25, 30, 1330], [155, 0, 779.5]);
b("gate-bar-6", [25, 30, 1330], [310, 0, 779.5]);
b("gate-bar-7", [25, 30, 1330], [465, 0, 779.5]);
b("gate-bar-8", [25, 30, 1330], [620, 0, 779.5]);
b("latch-plate", [115, 42, 160], [665, -53, 1149.5]);
c("hinge-upper", 80, 32, 10, [-720, 0, 1349.5]);
c("hinge-lower", 80, 32, 10, [-720, 0, 249.5]);

return p.model();
