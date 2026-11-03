// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "bay-column-protector",
  license: 'CC0-1.0',
  title: "Bay column protector",
  description: "Low two-sided guard around a structural post with beveled top caps." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "bay", "column", "protector"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#d09b51", { label: 'Asset color' });
const p = assembly("bay-column-protector");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("front-guard", [700, 105, 620], [0, -205, 310]);
b("side-guard", [105, 520, 620], [-298, 0, 310]);
b("top-cap-front", [730, 125, 48], [0, -205, 596]);
b("top-cap-side", [125, 520, 48], [-298, 0, 596]);
b("stripe-0", [68, 18, 400], [-245, -265, 310], [0, 0, -20]);
b("stripe-1", [68, 18, 400], [-100, -265, 310], [0, 0, -20]);
b("stripe-2", [68, 18, 400], [45, -265, 310], [0, 0, -20]);
b("stripe-3", [68, 18, 400], [190, -265, 310], [0, 0, -20]);

return p.model();
