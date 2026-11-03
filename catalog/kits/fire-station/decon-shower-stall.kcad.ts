// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "decon-shower-stall",
  license: 'CC0-1.0',
  title: "Decontamination shower stall",
  description: "Open shower bay with a raised pan, three-sided splash screen and overhead spray." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "shower", "stall"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#71817d", { label: 'Asset color' });
const p = assembly("decon-shower-stall");

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

b("shower-pan", [1100, 1000, 80], [0, 0, 40]);
b("rear-screen", [1100, 50, 2100], [0, 475, 1130]);
b("left-screen", [50, 950, 2100], [-525, 0, 1130]);
b("right-screen", [50, 950, 2100], [525, 0, 1130]);
c("shower-riser", 1720, 28, 10, [0, 350, 0]);
c("shower-head", 56, 115, 10, [0, 350, 1700], [1, 0, 0], 90);
b("grab-bar", [700, 44, 44], [0, 420, 920]);

return p.model();
