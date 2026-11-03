// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "exhaust-capture-nozzle",
  license: 'CC0-1.0',
  title: "Exhaust capture nozzle",
  description: "Flexible tailpipe capture head with a tapered socket and hanging handle." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "exhaust", "capture", "nozzle"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#697b78", { label: 'Asset color' });
const p = assembly("exhaust-capture-nozzle");

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

c("socket", 210, 90, 12, [0, 0, 0]);
c("neck", 180, 48, 10, [0, 0, 190]);
b("handle", [340, 42, 42], [0, 90, 340]);
b("grip", [120, 54, 45], [0, 90, 340]);
b("hose-collar", [145, 145, 55], [0, 0, 208]);

return p.model();
