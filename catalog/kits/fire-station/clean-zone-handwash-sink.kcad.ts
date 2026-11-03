// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "clean-zone-handwash-sink",
  license: 'CC0-1.0',
  title: "Clean-zone handwash sink",
  description: "Compact wall basin with splashback, hands-free control and soap dispenser." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean-zone", "handwash", "sink"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7e9088", { label: 'Asset color' });
const p = assembly("clean-zone-handwash-sink");

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

b("basin", [700, 460, 170], [0, 0, 900]);
b("splashback", [720, 58, 500], [0, 185, 1100]);
b("wall-bracket", [500, 80, 75], [0, 190, 785]);
c("tap", 240, 25, 8, [0, 110, 990]);
b("soap-dispenser", [130, 120, 250], [360, 135, 1160]);
b("towel-dispenser", [230, 115, 360], [-340, 125, 1200]);
b("pedestal-leg-0", [60, 60, 770], [-255, -140, 385]);
b("pedestal-leg-1", [60, 60, 770], [255, -140, 385]);

return p.model();
