// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-alerting-speaker",
  license: 'CC0-1.0',
  title: "Station alerting speaker",
  description: "Wall-mounted horn speaker with protective grille and shallow backbox." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "alerting", "speaker"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#718481", { label: 'Asset color' });
const p = assembly("station-alerting-speaker");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = cylinder(h, r, segments);
  if (axis && degrees) shape = shape.rotate(axis, degrees);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("backbox", [320, 90, 300], [0, 0, 1770]);
c("horn", 180, 150, 10, [0, -60, 1770], [1, 0, 0], 90);
b("grille", [255, 18, 220], [0, -160, 1770]);
b("mount-bracket", [70, 90, 140], [0, 0, 1550]);

return p.model();
