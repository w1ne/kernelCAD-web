// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "stacked-feline-condo",
  license: 'CC0-1.0',
  title: "Stacked feline condo",
  description: "Four-compartment feline housing unit with shelves, entry openings and a low climbing step." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "stacked", "feline", "condo", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#8d7f70", { label: 'Asset color' });
const p = assembly("stacked-feline-condo");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("base", [1320, 620, 100], [0, 0, 50]);
b("rear-panel-lower", [1240, 40, 520], [0, 280, 360]);
b("rear-panel-upper", [1240, 40, 520], [0, 280, 880]);
b("outer-side-left", [40, 560, 1080], [-640, 0, 600]);
b("center-divider", [40, 560, 1080], [0, 0, 600]);
b("outer-side-right", [40, 560, 1080], [640, 0, 600]);
b("middle-shelf", [1300, 600, 48], [0, 0, 620]);
b("top-cap", [1380, 680, 60], [0, 0, 1170]);
b("climb-step-one", [360, 230, 80], [-440, -430, 140]);
b("climb-step-two", [360, 230, 80], [-250, -430, 235]);

return p.model();
