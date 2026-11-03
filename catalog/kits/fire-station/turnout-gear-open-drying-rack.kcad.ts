// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "turnout-gear-open-drying-rack",
  license: 'CC0-1.0',
  title: "Turnout gear open drying rack",
  description: "Freestanding frame with four gear bays, boot shelves and hanging rails." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "turnout", "gear", "open", "drying", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#74827d", { label: 'Asset color' });
const p = assembly("turnout-gear-open-drying-rack");

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

b("upright-0", [48, 52, 1980], [-670, -260, 990]);
b("upright-1", [48, 52, 1980], [-225, -260, 990]);
b("upright-2", [48, 52, 1980], [225, -260, 990]);
b("upright-3", [48, 52, 1980], [670, -260, 990]);
b("upright-4", [48, 52, 1980], [-670, 260, 990]);
b("upright-5", [48, 52, 1980], [-225, 260, 990]);
b("upright-6", [48, 52, 1980], [225, 260, 990]);
b("upright-7", [48, 52, 1980], [670, 260, 990]);
b("top-rail-front", [1440, 48, 52], [0, -260, 1950]);
b("top-rail-back", [1440, 48, 52], [0, 260, 1950]);
b("boot-shelf", [1440, 560, 52], [0, 0, 90]);
c("hook-0", 110, 20, 8, [-500, 0, 1840]);
c("hook-1", 110, 20, 8, [-170, 0, 1840]);
c("hook-2", 110, 20, 8, [170, 0, 1840]);
c("hook-3", 110, 20, 8, [500, 0, 1840]);

return p.model();
