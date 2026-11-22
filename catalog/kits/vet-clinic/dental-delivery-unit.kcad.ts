// Veterinary dental delivery unit: Mobile dental cart with instrument tray, handpiece booms, controls and rinse bowl. Separate powder-coated steel, rubber, stainless steel surfaces keep its component silhouette readable.
meta({
  name: "dental-delivery-unit",
  license: 'CC0-1.0',
  title: "Veterinary dental delivery unit",
  description: "Mobile dental cart with instrument tray, handpiece booms, controls and rinse bowl. Material controls: powder-coated steel, rubber, stainless steel. Presets: clinicClean and softTeal.",
  tags: ["veterinary", "animal clinic", "animal health", "dental", "delivery", "unit", "low poly", "CC0"],
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
    case "caster-a": return rubberColor;
    case "caster-b": return rubberColor;
    case "caster-c": return rubberColor;
    case "caster-d": return rubberColor;
    case "mast": return stainlessSteelColor;
    case "instrument-tray": return stainlessSteelColor;
    case "rinse-bowl": return stainlessSteelColor;
  }
  return paintedSteelColor;
};
const p = assembly("dental-delivery-unit");

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

b("cart-base", [520, 420, 100], [0, 0, 162]);
c("caster-a", 36, 38, 8, [-225, -175, 0]);
c("caster-b", 36, 38, 8, [225, -175, 0]);
c("caster-c", 36, 38, 8, [-225, 175, 0]);
c("caster-d", 36, 38, 8, [225, 175, 0]);
c("mast", 720, 36, 10, [0, 0, 212]);
b("control-housing", [390, 310, 230], [0, 0, 652]);
b("instrument-tray", [470, 260, 42], [0, -30, 807]);
b("boom-left", [330, 36, 36], [-300, 80, 892], [0, 0, -22]);
b("boom-right", [330, 36, 36], [300, 80, 892], [0, 0, 22]);
c("rinse-bowl", 60, 72, 12, [0, 200, 782]);
c("handpiece-a", 160, 18, 8, [-250, -85, 802]);
c("handpiece-b", 160, 18, 8, [-170, -85, 802]);

return p.model();
