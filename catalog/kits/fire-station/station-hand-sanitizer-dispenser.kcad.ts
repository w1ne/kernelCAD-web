// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-hand-sanitizer-dispenser",
  license: 'CC0-1.0',
  title: "Station sanitizer dispenser",
  description: "Wall dispenser with a protected reservoir, push lever and drip-catch plate." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "sanitizer", "dispenser"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7c8980", { label: 'Asset color' });
const p = assembly("station-hand-sanitizer-dispenser");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("backplate", [210, 54, 420], [0, 0, 1480]);
b("reservoir", [165, 150, 275], [0, -58, 1520]);
b("push-lever", [155, 65, 38], [0, -125, 1370]);
b("catch-tray", [230, 150, 35], [0, -70, 1240]);
b("level-window", [38, 20, 150], [40, -138, 1530]);

return p.model();
