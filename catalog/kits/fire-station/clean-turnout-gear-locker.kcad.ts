// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "clean-turnout-gear-locker",
  license: 'CC0-1.0',
  title: "Clean turnout gear locker",
  description: "Tall clean-storage locker with helmet shelf, coat hooks and nameplate strip." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean", "turnout", "gear", "locker"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#71847d", { label: 'Asset color' });
const p = assembly("clean-turnout-gear-locker");

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

b("cabinet", [780, 620, 1950], [0, 0, 975]);
b("door-left", [370, 35, 1850], [-195, -325, 975]);
b("door-right", [370, 35, 1850], [195, -325, 975]);
b("nameplate", [240, 25, 90], [0, -350, 1810]);
c("hook-0", 86, 22, 8, [-130, -355, 1300], [1, 0, 0], 90);
c("hook-1", 86, 22, 8, [0, -355, 1300], [1, 0, 0], 90);
c("hook-2", 86, 22, 8, [130, -355, 1300], [1, 0, 0], 90);

return p.model();
