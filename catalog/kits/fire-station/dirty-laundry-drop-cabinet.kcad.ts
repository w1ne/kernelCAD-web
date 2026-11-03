// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "dirty-laundry-drop-cabinet",
  license: 'CC0-1.0',
  title: "Dirty laundry drop cabinet",
  description: "Wall-mounted lined chute cabinet with a swing flap and bag-retention rim." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "dirty", "laundry", "drop", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7d8278", { label: 'Asset color' });
const p = assembly("dirty-laundry-drop-cabinet");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("cabinet", [780, 360, 920], [0, 0, 1300]);
b("front", [720, 30, 760], [0, -194, 1300]);
b("drop-flap", [540, 36, 150], [0, -235, 1660], [12, 0, 0]);
b("bag-rim", [620, 260, 40], [0, 0, 820]);
b("label-plate", [270, 24, 120], [0, -225, 1030]);

return p.model();
