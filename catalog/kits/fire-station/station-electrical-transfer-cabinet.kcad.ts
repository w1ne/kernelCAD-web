// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-electrical-transfer-cabinet",
  license: 'CC0-1.0',
  title: "Station transfer switch cabinet",
  description: "Floor cabinet with labeled transfer switch door and cable raceway." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "transfer", "switch", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6e827d", { label: 'Asset color' });
const p = assembly("station-electrical-transfer-cabinet");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("base", [900, 650, 90], [0, 0, 45]);
b("cabinet", [820, 570, 1400], [0, 0, 790]);
b("door", [760, 28, 1310], [0, -300, 790]);
b("switch-handle", [55, 75, 240], [250, -360, 900]);
b("label-window", [250, 20, 130], [-170, -320, 1260]);
b("cable-raceway", [160, 100, 2200], [500, 80, 1110]);

return p.model();
