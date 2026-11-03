// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "decon-eyewash-station",
  license: 'CC0-1.0',
  title: "Decontamination eyewash station",
  description: "Floor eyewash pedestal with paired spray heads and a catch bowl." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "eyewash"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#759187", { label: 'Asset color' });
const p = assembly("decon-eyewash-station");

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

b("base", [400, 360, 100], [0, 0, 50]);
c("pedestal", 760, 38, 10, [0, 0, 0]);
c("bowl", 80, 150, 12, [0, 0, 735]);
c("spray-head-left", 42, 52, 8, [-92, -34, 820]);
c("spray-head-right", 42, 52, 8, [92, -34, 820]);
b("pull-handle", [320, 22, 32], [0, -70, 640]);

return p.model();
