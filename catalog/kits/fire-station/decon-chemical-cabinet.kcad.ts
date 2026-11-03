// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "decon-chemical-cabinet",
  license: 'CC0-1.0',
  title: "Decontamination supply cabinet",
  description: "Labeled cabinet for segregated cleaning supplies with drip shelf and lockable doors." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "supply", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#827e70", { label: 'Asset color' });
const p = assembly("decon-chemical-cabinet");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("cabinet", [900, 520, 1800], [0, 0, 900]);
b("left-door", [430, 26, 1680], [-220, -275, 900]);
b("right-door", [430, 26, 1680], [220, -275, 900]);
b("drip-shelf", [940, 560, 50], [0, 0, 70]);
b("shelf-0", [820, 470, 38], [0, 0, 420]);
b("shelf-1", [820, 470, 38], [0, 0, 810]);
b("shelf-2", [820, 470, 38], [0, 0, 1200]);
b("lock", [45, 28, 95], [0, -300, 870]);

return p.model();
