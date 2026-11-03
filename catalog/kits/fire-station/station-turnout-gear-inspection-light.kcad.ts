// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-turnout-gear-inspection-light",
  license: 'CC0-1.0',
  title: "Turnout gear inspection light",
  description: "Free-standing task light with wide weighted base and adjustable inspection head." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "turnout", "gear", "inspection", "light"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7e8980", { label: 'Asset color' });
const p = assembly("station-turnout-gear-inspection-light");

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

b("base", [420, 380, 70], [0, 0, 35]);
c("mast", 1480, 28, 8, [0, 0, 70]);
b("arm", [520, 38, 38], [230, 0, 1480], [0, 0, -12]);
b("light-head", [250, 190, 110], [480, -10, 1430]);
c("knob", 40, 42, 8, [180, 0, 1480], [1, 0, 0], 90);

return p.model();
