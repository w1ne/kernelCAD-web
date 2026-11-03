// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "hose-drying-tower",
  license: 'CC0-1.0',
  title: "Hose drying tower",
  description: "Freestanding hose drying frame with an overhead spreader and four hanging bays." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "hose", "drying", "tower"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#788985", { label: 'Asset color' });
const p = assembly("hose-drying-tower");

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

b("foot-left", [260, 360, 100], [-470, 0, 50]);
b("foot-right", [260, 360, 100], [470, 0, 50]);
b("mast-left", [80, 80, 3100], [-470, 0, 1600]);
b("mast-right", [80, 80, 3100], [470, 0, 1600]);
b("top-spreader", [1120, 180, 100], [0, 0, 3060]);
c("hose-hook-0", 180, 24, 8, [-360, 0, 2920]);
c("hose-hook-1", 180, 24, 8, [-120, 0, 2920]);
c("hose-hook-2", 180, 24, 8, [120, 0, 2920]);
c("hose-hook-3", 180, 24, 8, [360, 0, 2920]);

return p.model();
