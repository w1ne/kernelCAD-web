// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "scba-cylinder-fill-bank",
  license: 'CC0-1.0',
  title: "SCBA cylinder fill bank",
  description: "Cylinder refill cabinet with guarded fill sockets and hinged blast-shield lid." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "scba", "cylinder", "fill", "bank"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#70827e", { label: 'Asset color' });
const p = assembly("scba-cylinder-fill-bank");

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

b("base", [980, 760, 180], [0, 0, 90]);
b("cabinet", [900, 680, 780], [0, 0, 570]);
b("shield", [900, 80, 440], [0, 385, 690]);
b("top-cover", [980, 760, 70], [0, 0, 995]);
c("fill-port-0", 74, 32, 8, [-300, -365, 610], [1, 0, 0], 90);
c("fill-port-1", 74, 32, 8, [-100, -365, 610], [1, 0, 0], 90);
c("fill-port-2", 74, 32, 8, [100, -365, 610], [1, 0, 0], 90);
c("fill-port-3", 74, 32, 8, [300, -365, 610], [1, 0, 0], 90);
b("pressure-display", [290, 34, 165], [0, -367, 820]);

return p.model();
