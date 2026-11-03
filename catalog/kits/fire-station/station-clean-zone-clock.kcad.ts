// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-clean-zone-clock",
  license: 'CC0-1.0',
  title: "Station clean-zone clock",
  description: "Large wall clock with a deep bezel and high-contrast index marks." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean-zone", "clock"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#748782", { label: 'Asset color' });
const p = assembly("station-clean-zone-clock");

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

b("backplate", [620, 75, 620], [0, 0, 1750]);
c("bezel", 80, 285, 12, [0, -45, 1750], [1, 0, 0], 90);
c("face", 18, 244, 12, [0, -95, 1750], [1, 0, 0], 90);
b("hour-mark-0", [16, 18, 52], [0, -112, 1960]);
b("hour-mark-1", [16, 18, 52], [145, -112, 1905]);
b("hour-mark-2", [16, 18, 52], [205, -112, 1750]);
b("hour-mark-3", [16, 18, 52], [145, -112, 1595]);
b("hour-mark-4", [16, 18, 52], [0, -112, 1540]);
b("hour-mark-5", [16, 18, 52], [-145, -112, 1595]);
b("hour-mark-6", [16, 18, 52], [-205, -112, 1750]);
b("hour-mark-7", [16, 18, 52], [-145, -112, 1905]);
b("minute-hand", [14, 150, 18], [0, -125, 1785], [0, 0, 30]);

return p.model();
