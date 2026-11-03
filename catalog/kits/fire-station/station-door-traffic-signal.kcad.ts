// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-door-traffic-signal",
  license: 'CC0-1.0',
  title: "Station door traffic signal",
  description: "Two-lamp wall signal with a protective cage for airlock traffic status." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "door", "traffic", "signal"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#a17c55", { label: 'Asset color' });
const p = assembly("station-door-traffic-signal");

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

b("mount-plate", [260, 70, 600], [0, 0, 1800]);
c("upper-lamp", 150, 100, 10, [0, -45, 1980]);
c("lower-lamp", 150, 100, 10, [0, -45, 1620]);
b("guard-top", [260, 40, 32], [0, -90, 2100]);
b("guard-bottom", [260, 40, 32], [0, -90, 1500]);

return p.model();
