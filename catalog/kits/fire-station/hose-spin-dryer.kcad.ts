// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "hose-spin-dryer",
  license: 'CC0-1.0',
  title: "Hose spin dryer",
  description: "Vertical hose dryer with a guarded drum, top lid and drain foot." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "hose", "spin", "dryer"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6b8382", { label: 'Asset color' });
const p = assembly("hose-spin-dryer");

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

b("base", [640, 640, 140], [0, 0, 70]);
c("drum", 760, 285, 12, [0, 0, 0]);
b("door-frame", [390, 48, 470], [0, -292, 510]);
b("lid", [650, 650, 70], [0, 0, 905]);
c("status-light", 90, 32, 8, [250, -295, 870]);

return p.model();
